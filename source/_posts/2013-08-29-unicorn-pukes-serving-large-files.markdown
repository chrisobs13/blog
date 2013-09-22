---
layout: post
title: "Unicorn Pukes Serving Large Files"
date: 2013-08-29 13:46
comments: true
categories: rails ruby unicorn
---

Earlier today I was getting this weird [unicorn][unicorn] error on heroku when trying to serve a retina-sized image.

    ERROR -- : app error: undefined method `each' for nil:NilClass (NoMethodError)
    ERROR -- : [..]/unicorn-4.6.3/lib/unicorn/http_response.rb:60:in `http_response_write'
    ERROR -- : [..]/unicorn-4.6.3/lib/unicorn/http_server.rb:563:in `process_client'
    ERROR -- : [..]/unicorn-4.6.3/lib/unicorn/http_server.rb:633:in `worker_loop'
    ERROR -- : [..]/unicorn-4.6.3/lib/unicorn/http_server.rb:500:in `spawn_missing_workers'
    ERROR -- : [..]/unicorn-4.6.3/lib/unicorn/http_server.rb:142:in `start'
    ERROR -- : [..]/unicorn-4.6.3/bin/unicorn_rails:209:in `<top (required)>'

Weird, right?  But sure enough, whenever I tried to view some-image@2x.png, everything went terribly wrong.

Googling took too long to find an answer, so I'm sharing my solution here in hopes that it helps someone else (oh, hai, google bot).

The issue is actually a bug in the version of rack-cache required by actionpack in Rails 3.2.14. Attempting to serve files larger than 1mb causes this error.

It has been [fixed][gh], but I had to require the master branch for rack-cache to resolve the problem.

```ruby Gemfile
gem "rack-cache", github: "rtomayko/rack-cache"
gem "unicorn"
```

No more error.

Now, the real solution is to not serve large images through unicorn on heroku. But hooking up a CDN is another problem for another time.

[gh]: https://github.com/rtomayko/rack-cache/issues/42
[unicorn]: http://unicorn.bogomips.org/
