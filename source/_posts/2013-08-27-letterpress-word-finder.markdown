---
layout: post
title: "Letterpress Word Finder"
date: 2013-08-27 16:13
comments: true
categories: ruby letterpress
---

In an attempt to start to blog more, here's a quick follow-up post on the [previous Letterpress article][lp].

### Background

As a reminder, here's how I outlined steps in creating a Letterpress solver:

1. Take screenshot of game and import it into solver
2. Parse the board into a string of letters
3. Reduce a dictionary of valid words against those characters to find playable words
4. Optionally make recommendations of which word to play based on current board state and strategy. (i.e. don't be naive)

We built step one (sort-of) and step two in the previous article, so let's move on to step three.

### Requirements
We want our script to fulfill the following requirements:

1. Accept the board letters via STDIN or commandline arguments.
2. Reduce the dictionary words against those letters.
3. Dump out matching words (without regard to board state/strategy).

### Implementation
We'll take either an argument or read STDIN and downcase it.

```ruby
letters = (ARGV[0] || STDIN.read).downcase
```

I don't have the official Letterpress dictionary (a quick googling will get you on the right track if you insist), but every good unix-y system has a dictionary file.

    $ cat /usr/share/dict/words | wc -l
    235886

OK, that's a lot of words. Let's pull them in and downcase them too.
```ruby
words = File.read("/usr/share/dict/words").downcase.split("\n")
```

Now, the only really interesting part: a method to determine if a word can be constructed from letters. I've shamelessly borrowed a perfectly fast solution from [Stackoverflow][so].
```ruby
def is_subset?(word, letters)
  !word.chars.find{|char| word.count(char) > letters.count(char)}
end
```

And now we reduce our words by those that match our letters

```ruby
matching_words = words.select do |word|
  is_subset?(word, letters)
end
```

And there's nothing left to do but dump them out.

```ruby
puts matching_words.sort_by(&:length)
```

Here's the [entire word generating script][gist].

And an example of using it with the board parser from the previous post:

    $ ruby -r ./board_parser -e "puts BoardParser.new('light.png').tiles.join" | ruby letter.rb | tail -n 10
    hermodactyl
    typhlectomy
    cryohydrate
    polydactyle
    pterodactyl
    crymotherapy
    hydrolyzable
    acetylthymol
    overthwartly
    protractedly

Excellent. Of course, not all words in your system's dictionary file may be playable, YMMV, etc.

[lp]: http://blog.semanticart.com/blog/2012/11/18/quick-and-dirty-ocr-for-letterpress-and-other-tile-based-games/
[so]: http://stackoverflow.com/questions/11349544/ruby-optimize-the-comparison-of-two-arrays-with-duplicates
[gist]: https://gist.github.com/semanticart/6346135
