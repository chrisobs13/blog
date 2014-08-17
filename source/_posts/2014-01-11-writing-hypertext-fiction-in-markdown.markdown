---
layout: post
title: "Writing Hypertext Fiction in Markdown"
date: 2014-01-11 18:50
comments: true
categories: writing
---

Remember [Choose Your Own Adventure][cyoa] books? I fondly remember finding new ways to get myself killed as I explored Aztec ruins or fought off aliens. Death or adventure waited just a few pages away and  I was the one calling all the shots.

Introducing my son to [Hypertext Fiction][hf] has rekindled my interest. I wondered how difficult it would be to throw something together to let me easily write CYOA-style books my kid could read on a kindle. I love markdown, so a toolchain built around it was definitely in order.

As it turns out, [Pandoc][pandoc] fits the bill perfectly. You can write a story in markdown and easily export it to EPUB. From there you're just a quick step through [ebook-convert (via calibre's commandline tools)][calibre] to a well-formed .mobi file that reads beautifully on a kindle.

Here's a quick example markdown story:

```
% You're probably going to die.
% Jeffrey Chupp

# Something isn't right here. {#intro}

You hear a phone ringing.

- [pick up phone](#phone)
- [do not answer](#ignore-phone)
- [set yourself on fire](#fire)

# You pick up the phone... {#phone}

It is your grandmother. You die.

- [start over](#intro)

# You ignore the phone... {#ignore-phone}

It was your grandmother. You die.

- [start over](#intro)

# You set yourself on fire... {#fire}

Strangely, you don't die. Guess you better start getting ready for school.

- [pick up backpack and head out](#backpack)
- [decide to skip school](#skip)

# You decide to skip school {#skip}

A wild herd of dinosaurs bust in and kill you. Guess you'll never get to tell your friends about how you're immune to flame... or that you met live dinosaurs :(

- [start over](#intro)

# Going to school {#backpack}

You're on your way to school when a meteor lands on you, killing you instantly.

- [start over](#intro)
```

From the top, we have percent signs before the title and publishing date which Pandoc uses for the title page.

Then each chapter/section begins with an h1 header which has an id specified. This id is what we'll use in our links to let a reader choose where to go next.

If you don't specify a link, Pandoc will dasherize your header text, but it is probably easier to be specific since you need to reference it in your link choices anyway.

Save that as story.md and run the following to get your epub and mobi versions:

`pandoc -o story.epub story.md && /usr/bin/ebook-convert story.epub story.mobi`

BONUS: ebook-convert even complains if one of your links points to an invalid destination.

Here's a preview as seen in [Kindle Previewer][kp]

{% img right /images/preview.png 328 560 'Example Generated mobi file' %}

And here are the generated [EPUB][epub] and [\.mobi][mobi] files and the [markdown source file][md].

Now, get writing!

[cyoa]: https://en.wikipedia.org/wiki/Choose_Your_Own_Adventure
[hf]: https://en.wikipedia.org/wiki/Hypertext_fiction
[pandoc]: http://johnmacfarlane.net/pandoc/
[calibre]: http://manual.calibre-ebook.com/cli/ebook-convert.html
[kp]: http://www.amazon.com/gp/feature.html?docId=1000765261
[epub]: /story.epub
[mobi]: /story.mobi
[md]: /story.md
