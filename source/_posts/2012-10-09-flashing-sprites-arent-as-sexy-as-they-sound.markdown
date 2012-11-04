---
layout: post
title: "Flashing sprites aren't as sexy as they sound"
date: 2012-10-09 20:15
comments: true
categories: css compass front-end
---

My skills have traditionally skewed towards the back-end so I'm still finding lots of new tricks in front-end development that are new to me. Here's a quick example...

I recently created a button with [Compass sprites][sprite] that had images for the default state, hover state, and active (pressed) state.

Here's the gist of what I was doing:

``` sass special_button.sass
$button_sprites: sprite-map('/special-button/*.png')

.special-button
  background: sprite($button_sprites, "button-default")

  &:hover
    background: sprite($button_sprites, "button-hover")

  &:active
    background: sprite($button_sprites, "button-active")
```

which generates this css:

``` css special_button.css
.special-button {
  background: url(/assets/special-button-sb6a3aa70c5.png) 0 -204px
}
.special-button:hover {
  background: url(/assets/special-button-sb6a3aa70c5.png) 0 -230px;
}
.special-button:active {
  background: url(/assets/special-button-sb6a3aa70c5.png) 0 -126px;
}
```


Pretty straight-forward, right? For each state I specify which of the sprite sub-images it should show.

Unfortunately, I was bumping into an issue in Chrome where the button would sometimes flash between image states on hover and active.

After a bit of googling, I found [an answer][so]. The problem is that I was specifying the URL redundantly, causing Chrome to show no background while it briefly loads that same sprite again to show it at the new position. After a little digging in the Compass docs, I found [sprite-position][position] and tweaked accordingly:

``` sass special_button_fixed.sass
$button_sprites: sprite-map('/special-button/*.png')

.special-button
  background: sprite($button_sprites, "button-default")

  &:hover
    background-position: sprite-position($button_sprites, "button-hover")

  &:active
    background-position: sprite-position($button_sprites, "button-active")
```

Now we're using the same sprite specified in the original ``.special_button`` class and just changing the position in the other states. Our flashing problem is gone.

[so]: http://stackoverflow.com/questions/8035366/image-flickering-on-mouseover-even-when-sprites-are-used-for-hover-image "StackOverflow Post"
[sprite]: http://compass-style.org/help/tutorials/spriting/ "Compass Sprite Tutorial"
[position]: http://compass-style.org/reference/compass/helpers/sprites/#sprite-position
