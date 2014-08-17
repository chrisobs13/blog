---
layout: post
title: "A simple API proxy written in Go"
date: 2013-09-23
comments: true
categories: go apis rails
---

# UPATE: see ["A proper API proxy written in Go"][newpost] for a better solution to this problem.

### The problem:

Have you ever written a javascript app that needed to consume an API? What if the API requires you to pass your api key along in the query params? How do you hide your key?

This weekend I bumped into this issue once again. I was writing a simple app in angular to consume the last.fm api when it hit me.

This usually leaves me with two options:

1. Decide my api key isn't worth hiding and just embed it in the javascript.
2. Make a call to the app server (I'm usually using Rails) that would then make the API call within the request lifecycle and return the json when the API call finishes.

Option 1 is also known as "giving up" - you don't really want everyone to have your api key, do you? What happens when someone else starts using it to do nefarious things on your behalf or just decides to help you hit your rate limit faster?

Option 2 is safer, but now your poor app server pays the penalty of the API being slow. If the API call takes 3 seconds, your server process/thread is tied up for that time. Lame.

Imagine your rails app is built around an external API. Do you really want to spin up more and more instances to gain concurrency just to protect your key?

### The solution: Move things out-of-band

For requests that could otherwise hit the api directly, your app server shouldn't pay the penalties of keeping your key secure. So let's move things out-of-band.

I'd been meaning to play with [Go][golang] for some time but never had the right project. The implementation here was fairly simple but needed to be highly concurrent, so this felt like a good fit.

Borrowing from example Go http servers and http consumers, I came up with this:

``` go
package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

func errorOut(err error) {
	fmt.Printf("%s", err)
	os.Exit(1)
}

func handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "X-Requested-With")

	if r.Method == "GET" {
		var newUrl string = os.Getenv("URL_ROOT") + r.URL.Path[1:] + "?" +
        r.URL.RawQuery + os.Getenv("URL_SUFFIX")

		fmt.Printf("fetching %s\n", newUrl)

		response, err := http.Get(newUrl)
		if err != nil {
			errorOut(err)
		} else {
			defer response.Body.Close()
			contents, err := ioutil.ReadAll(response.Body)
			if err != nil {
				errorOut(err)
			}
			fmt.Fprintf(w, "%s\n", contents)
		}
	}
}
```

The server takes incoming requests and will translate the url by substituting the provided URL_ROOT and appending the URL_SUFFIX (the api key). It fetches that foreign url and then returns the results.

So with the example config:

    URL_ROOT=http://ws.audioscrobbler.com/2.0/ URL_SUFFIX=&api_key=XXXXXXXXXXXXX

A request to the go server at http://example.com/?method=user.getrecenttracks&user=violencenow&format=json would return the contents of http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=violencenow&format=json&api_key=XXXXXXXXXXXXX

This isn't a solution for everything. Right now it only supports GET requests - this is probably all you'd ever want, lest someone start posting to your endpoint and doing things you don't expect. These sorts of potentially destructive behaviors are perhaps better handled in-band where you can apply some sanity checks.

But if all you need to do is get content from an API without exposing your keys to the public, this might be a good solution for you.

### Some numbers
This is very unscientific, but I setup a [Go server][sleepy] on heroku http://sleepy-server.herokuapp.com/ that takes a request, waits 1 second, and then returns plain text.

The benchmark for that with `ab -c 300 -n 600 "http://sleepy-server.herokuapp.com/"`

    Concurrency Level:      300
    Time taken for tests:   5.046 seconds
    Complete requests:      600
    Failed requests:        0
    Write errors:           0
    Total transferred:      83400 bytes
    HTML transferred:       2400 bytes
    Requests per second:    118.91 [#/sec] (mean)
    Time per request:       2522.907 [ms] (mean)
    Time per request:       8.410 [ms] (mean, across all concurrent requests)
    Transfer rate:          16.14 [Kbytes/sec] received

    Connection Times (ms)
                  min  mean[+/-sd] median   max
    Connect:       28  322 534.7    107    2257
    Processing:  1040 1229 223.1   1148    2640
    Waiting:     1038 1228 223.0   1148    2640
    Total:       1069 1552 587.1   1309    3867

Now, let's use our api_proxy to fetch requests from that server and serve them up by setting `URL_ROOT=http://sleepy-server.herokuapp.com`.

And we'll use the same benchmark command: `ab -c 300 -n 600 "http://some-fake-server-name-here.herokuapp.com/"`

    Concurrency Level:      300
    Time taken for tests:   5.285 seconds
    Complete requests:      600
    Failed requests:        0
    Write errors:           0
    Total transferred:      132000 bytes
    HTML transferred:       3000 bytes
    Requests per second:    113.54 [#/sec] (mean)
    Time per request:       2642.282 [ms] (mean)
    Time per request:       8.808 [ms] (mean, across all concurrent requests)
    Transfer rate:          24.39 [Kbytes/sec] received

    Connection Times (ms)
                  min  mean[+/-sd] median   max
    Connect:       28  324 550.9     75    2260
    Processing:  1049 1406 325.2   1333    3012
    Waiting:     1049 1405 325.1   1331    3012
    Total:       1085 1730 609.4   1644    3875

Scientific or not, that's performance I can live with. And hopefully those API endpoints aren't quite taking a full second per request.

[golang]: http://golang.org/
[hb]: https://github.com/kr/heroku-buildpack-go
[sleepy]: https://gist.github.com/semanticart/b0285765737997e8593://gist.github.com/semanticart/b0285765737997e8593e
[newpost]: http://blog.semanticart.com/blog/2013/11/11/a-proper-api-proxy-written-in-go/
