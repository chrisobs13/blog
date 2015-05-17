---
layout: post
title: "I18n Game Content: Multilingual Audiosprites And Captions Workflow"
date: 2015-05-17 18:29
comments: true
categories:
---

*I've started making a list in my head of things I feel strongly about in software. I18n is pretty high towards the top of that list. I wrote (and re-wrote) a post explaining why i18n is so darn important, but I couldn't find a comfortable balance between all-out rant and something that felt hollow. In the meantime, I'm just going to say clearly: **"Please internationalize your software."***

*Here's an example of I18n in the wild.*

## I was working on a game...
I've wanted to make a video game since I was a kid sitting at my dad's Apple IIc thumbing through the Basic manual. I briefly toyed around with various attempts over the years but never really got very serious. Last year I finally devoted some real time into learning both Unity and Phaser. I ended up shelving game-dev for a bit, but it was fun exploring new challenges.

While I was prototyping an adventure game in [Phaser][phaser], I wanted to build a robust audio and text dialogue system that supported multiple language locales. I ended up finding some neat technologies and creating a comfortably streamlined workflow.

You can [check out the resulting audio engine prototype][prototype] read on for the process.

## The requirements
1. cross-browser compatible audio
2. captions in multiple languages
3. audio in multiple languages
4. easy to create and update
5. caption display timing synchronized with audio

(Note that the actual mechanics of dialogue bouncing between person A and person B won't be covered here.)

## Cross-browser compatible audio
Different browsers [support different audio formats][formats] out of the box. If you want cross-browser compatible audio, you really want to serve your content in multiple formats. Don't fret about bandwidth: clever frameworks (Phaser included) will only download the best format for the current browser.

In Phaser, you just pass an array of audio files.

```javascript
game.load.audio('locked_door', [
    'assets/audio/locked_door.ac3',
    'assets/audio/locked_door.ogg'
]);
```

You want ogg for Firefox and then probably m4a and/or ac3. You might want to avoid mp3 for licensing reasons, but I'm not a lawyer (I'm also not an astronaut).

## Captions in multiple languages

For our purposes, captions are really just text displayed on the screen. In nearly every adventure game, the character will encounter a locked door. Attempting to walk through that door should result in our character explaining why that can't happen yet.

Even if we didn't care about internationalization, it would make sense to refer to the caption content by a key rather than hard-coding the full text strings throughout our game. Beyond just keeping our code clean, externalizing the strings will allow us to have all our content in one place for easy editing.

Here's a very simple caption file in JSON format:

```json
{
  "found_key": "Oh, look: a key.",
  "locked_door": "Drats! The door is locked.",
  "entered_room": "Finally, we're indoors."
}
```

We'll write a function to render the caption so that we only need to pass in the key:

``` javascript

function say(translationKey) {
  // get the text from our captions json
  var textToRender = game.cache.getJSON('speechCaptions')[translationKey];

  // draw our caption
  game.add.text(0, 20, textToRender, captionStyle);
}

say("locked_door");
```

And it renders something like this:

![locked door caption](/images/locked_door.jpg)

Localizing our captions is pretty straightforward. For each language we want to support, we copy an existing translation file and replace the JSON values (not the keys) with translated versions.

We'd do well to leverage convention over configuration. Keep all captions for a locale in a folder with the locale name.

```
/assets/audio/en/captions.json
/assets/audio/de/captions.json
...
```

Changing locales should change the locale folder being used. Your game is always loading "captions.json" and it just decides which copy to load based on the player's locale.

## Audio in multiple languages

This part doesn't need to be overly clever. Record the same content in various formats for each language.

Consider the caption JSON from the previous section. It might make sense to have one JSON file per character. With some direction, a voice actor could read each line and you could save the line with a filename matching the key (e.g. the audio "Drats! The door is locked." is saved as locked_door.wav).

We'll store the encoded versions in locale-specific folders as we did with our captions.json

```
/assets/audio/en/locked_door.ac3
/assets/audio/en/locked_door.ogg
/assets/audio/de/locked_door.ac3
/assets/audio/de/locked_door.ogg
...
```

And then we can update our `say` function to also play the corresponding bit of audio.

``` javascript
function say(translationKey) {
  // get the text from our captions json
  var textToRender = game.cache.getJSON('speechCaptions')[translationKey];

  // draw our caption
  game.add.text(0, 20, textToRender, captionStyle);

  // speak our line
  game.speech.play(translationKey);
}

say("locked_door");
```

## Easy to create and update

Have you ever played a game or watched a movie where the captions didn't accurately reflect what was being said? This drives me crazy.

I'm guessing that the reason that audio and caption text fall out of sync is probably late content changes or the result of actors ad-libbing. Fortunately we've got a system that is friendly to rewrites from either side. Prefer the ad-lib? Update the caption file. Change the caption? Re-record the corresponding line.

The content workflow here is straightforward. To reiterate:

* Create a script as json with keys and text. Edit this until you're happy. Tweak it as the game content progresses.
* Translate that file into as many locales as you care about.
* Losslessly record each line for each locale and save the line under the file name of the key.
* Tweak captions and re-record as necessary.

That's all well and good, but now you've got a ton of raw audio files you'll need to encode over and over again. And having a user download hundreds of small audio files is hardly efficient.

We can do better. Enter the Audio Sprite. You may already be familiar with its visual counterpart [the sprite sheet][sprite], which combines multiple images into a single image. An audio sprite combines multiple bits of audio into one file and has additional data to mark when each clip starts and ends.

Using the [audiosprite][audiosprite] library, we can store all of our raw audio assets in a per-locale folder and run:

```
➜  audiosprite raw-audio/en/*.wav -o assets/audio/en/speech
info: File added OK file=/var/folders/yw/9wvsjry92ggb9959g805_yfsvj7lg6/T/audiosprite.16278579225763679, duration=1.6600907029478458
info: Silence gap added duration=1.3399092970521542
info: File added OK file=/var/folders/yw/9wvsjry92ggb9959g805_yfsvj7lg6/T/audiosprite.6657312458846718, duration=1.8187981859410431
info: Silence gap added duration=1.1812018140589569
info: File added OK file=/var/folders/yw/9wvsjry92ggb9959g805_yfsvj7lg6/T/audiosprite.3512551293242723, duration=2.171519274376417
info: Silence gap added duration=1.8284807256235829
info: Exported ogg OK file=assets/audio/en/speech.ogg
info: Exported m4a OK file=assets/audio/en/speech.m4a
info: Exported mp3 OK file=assets/audio/en/speech.mp3
info: Exported ac3 OK file=assets/audio/en/speech.ac3
info: Exported json OK file=assets/audio/en/speech.json
info: All done
```

Awesome. This generated a single file that joins together all of our content and did so in multiple formats. If we peek in the generated JSON file we see

```json
{
  "resources": [
    "assets/audio/en/speech.ogg",
    "assets/audio/en/speech.m4a",
    "assets/audio/en/speech.mp3",
    "assets/audio/en/speech.ac3"
  ],
  "spritemap": {
    "entered_room": {
      "start": 0,
      "end": 1.6600907029478458,
      "loop": false
    },
    "found_key": {
      "start": 3,
      "end": 4.818798185941043,
      "loop": false
    },
    "locked_door": {
      "start": 6,
      "end": 8.171519274376417,
      "loop": false
    }
  }
}
```

Phaser [supports audiosprites][audiosprite-docs] quite well. We tweak our engine a bit to use sprites instead of individual files and we're good to go.

## Caption display timing synchronized with audio
Now we turn to keeping the captions we're displaying in sync with the audio being played. We have all the timing data we need in our audiosprite JSON.

We'll update our `say` function to clean up the dialog text after the audio has ended:

``` javascript
function say(translationKey) {
  // get the text from our captions json
  var textToRender = game.cache.getJSON('speechCaptions')[translationKey];

  // draw our caption
  var caption = game.add.text(0, 20, textToRender, captionStyle);

  // speak our line
  var audio = game.speech.play(translationKey);

  // set a timeout to remove the caption when the audio finishes
  setTimeout(function(){
    caption.destroy();
  }, audio.durationMS);
}

say("locked_door");
```

Aside: Not everyone reads at the same speed. You'll probably want to consider having some sort of slider that acts as a multiplier for the caption duration. Readers who prefer to read more slowly can happily use 1.5X or 2X caption duration. You might not want to have the slider go less than 1X lest the captions disappear while the speech audio is still ongoing, but perhaps some portion of your audience will turn off audio in favor of reading quickly. The duration of the audio still makes sense to me as a starting point for caption duration.

## The prototype code
The [prototype code][prototype-code] covers all you need to get rolling with Phaser and Audiosprites. It also has basic support for preventing people talking over each other. Hopefully you'll find it instructive or at least interesting.

That concludes this random example of I18n in the wild. Stay global, folks.

[phaser]: http://phaser.io/ "Phaser - A fast, fun and free open source HTML5 game framework"
[formats]: https://developer.mozilla.org/en-US/docs/Web/HTML/Supported_media_formats#Browser_compatibility "Media formats supported by the HTML audio and video elements"
[sprite]: http://en.wikipedia.org/wiki/Sprite_%28computer_graphics%29 "Wikipedia: Sprite (computer graphics)"
[audiosprite]: https://github.com/tonistiigi/audiosprite "Github: audiosprite - Jukebox/Howler/CreateJS compatible audio sprite generator"
[audiosprite-docs]: http://phaser.io/docs/2.2.3/Phaser.AudioSprite.html
[prototype]: /i18n-phaser-example/
[prototype-code]: https://github.com/semanticart/i18n-phaser-audiosprite-example
