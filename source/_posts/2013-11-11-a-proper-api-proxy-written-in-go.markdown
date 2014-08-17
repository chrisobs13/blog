---
layout: post
title: "A proper API proxy written in Go"
date: 2013-11-11 16:16
comments: true
categories: go apis
---

A little over a month ago, I blogged about [a API proxy written in Go][oldpost]. This post contained a functioning but incredibly naive (not to mention unidiomatic) piece of Go code intended to allow proxying API requests while hiding your API keys. Here's an updated version that makes better use of the Go standard library and works using layers like Ruby's middleware (for more on this topic, [see the excellent article here][middleware]). It also improves upon the original in that it will work with all HTTP verbs.

When writing the first version, I tried using [httputil.NewSingleHostReverseProxy][revproxy] since the name sounds like exactly what I was trying to do. There was an important piece missing by default, though, which made the library seem mysteriously broken. Being a newbie in a hurry, I went with the solution you can see in the previous post.

What was missing? httputil.NewSingleHostReverseProxy does not set the host of the request to the host of the destination server. If you're proxying from foo.com to bar.com, requests will arrive at bar.com with the host of foo.com. Many webservers are configured to not serve pages if a request doesn't appear from the same host.

Fortunately it isn't too complicated to modify the chain to tweak the host.

``` go
func sameHost(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Host = r.URL.Host
		handler.ServeHTTP(w, r)
	})
}

```

And the usage:
``` go
// initialize our reverse proxy
reverseProxy := httputil.NewSingleHostReverseProxy(serverUrl)
// wrap that proxy with our sameHost function
singleHosted := sameHost(reverseProxy)
http.ListenAndServe(":5000", singleHosted)
```

Perfect. We're now setting the host of the request to the host of the destination URL.

Continuing with this approach, let's combine our secret query params with the existing request query.

``` go
func queryCombiner(handler http.Handler, addon string) http.Handler {
	// first parse the provided string to pull out the keys and values
	values, err := url.ParseQuery(addon)
	if err != nil {
		log.Fatal("addon failed to parse")
	}

	// now we apply our addon params to the existing query
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query()

		for k, _ := range values {
			query.Add(k, values.Get(k))
		}

		r.URL.RawQuery = query.Encode()
		handler.ServeHTTP(w, r)
	})
}
```

And usage is similar to above. We just continue to chain together our handlers.

``` go
combined := queryCombiner(singleHosted, "key=value&name=bob")
```

Finally, we'll need to allow [CORS][cors] on our server.

``` go
func addCORS(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "X-Requested-With")
		handler.ServeHTTP(w, r)
	})
}
```

And add that to our chain

``` go
cors := addCORS(combined)
http.ListenAndServe(":5000", cors)
```

The code is available on [github][gh] and it runs quite well with the [heroku go buildpack][hb].

It has a couple tests. I should add some more, but I'm not totally happy with the current testing approach. Feedback is very welcome.

[oldpost]: http://blog.semanticart.com/blog/2013/09/23/a-simple-api-proxy-written-in-go/
[middleware]: http://justinas.org/writing-http-middleware-in-go/
[revproxy]: http://golang.org/pkg/net/http/httputil/#NewSingleHostReverseProxy
[cors]: http://en.wikipedia.org/wiki/Cross-origin_resource_sharing
[gh]: https://github.com/semanticart/simpleapiproxy
[hb]: https://github.com/kr/heroku-buildpack-go
