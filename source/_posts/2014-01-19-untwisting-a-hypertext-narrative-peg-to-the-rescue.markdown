---
layout: post
title: "Untwisting a Hypertext Narrative - PEG to the Rescue!"
date: 2014-01-19 13:18
comments: true
categories: writing peg ruby parslet
---

In this post you'll learn why I think Parsing Expression Grammars are awesome and see an example of how I built one to scratch an itch.

## The Itch

After spending some time [writing Choose Your Own Adventure-style books in markdown][previous-post], I quickly realized there were some tools missing that could greatly improve the writing process. A few missing items were:

1. Knowing if there are any unreachable sections that have been orphaned in the writing process.
2. Being able to see all the branches within a book.
3. Knowing each branch is coherent by having an easy way to read through them.

"Never fear," I say to myself, "I can just write some code to parse the markdown files and pluck out the paths. This will be easy."

As a quick reminder, the format for a single section looks something like this:

```
# Something isn't right here. {#intro}

You hear a phone ringing.

- [pick up phone](#phone)
- [do not answer](#ignore-phone)
- [set yourself on fire](#fire)
```

(Headers specify new sections starting and have some anchor. Links direct you to new sections.)

There are plenty of ways to slurp in a story file and parse it. You could write a naive line-by-line loop that breaks it into sections based on the presence of a header and then parse the links within sections with substring matching. You could write some complicated regular expression because [we all know how much fun regular expressions can become][so]. Or you could do something saner like write a [parsing expression grammar][peg] (hereafter PEG).

## Why a PEG?

Generally, a regex makes for a beautiful collection of cryptic ascii art that you'll either comment-to-death or be confused by when you stumble across it weeks or months later. PEGs take a different approach and instead seek define ["a formal language in terms of a set of rules for recognizing strings in the language."][peg] Because they're a set of rules, you can slowly TDD your way up from parsing a single phrase to parsing an entire document (or at least the parts you care about).

(It is worth mentioning that because the format here is pretty trivial, either the naive line-by-line solution or a regex is fine. PEGs are without a doubt the right choice IMHO for complicated grammars.)

## Show me some code

We'll be using [Parslet][parslet] to write our PEG. Parslet provides a succinct syntax and exponentially better error messages than other competing ruby PEGs (`parse_with_debug` is my friend). My biggest complaint about Parslet is that the documentation was occasionally lacking, but it only slowed things down a bit - and there's an [IRC channel and mailing list][more-docs].

Let's start off simple, just parsing the links out of a single section of markdown. Being a TDD'er, we'll write a few simple tests first (in MiniTest::Spec):

```ruby
describe LinkParser do
  def parse(input)
    LinkParser.new.parse(input)
  end

  it "can match a single link" do
    parsed = parse("[some link name](#some-href)").first

    assert_equal "some-href",
      parsed[:id]
  end

  it "can match a single link surrounded by content" do
    parsed = parse("
      hey there [some link name](#some-href)
      some content
    ").first

    assert_equal "some-href",
      parsed[:id]
  end

  it "can match a multiple links surrounded by content" do
    parsed = parse("
      hey there [some link name](#some-href)
      some content with a link [another](#new-href) and [another still](#last) ok?
    ")

    assert_equal ["some-href", "new-href", "last"],
      parsed.map{|s| s[:id].to_s}
  end
end
```

And the working implementation of LinkParser:

```ruby
class LinkParser < Parslet::Parser
  rule(:link_text) { str("[") >> (str(']').absent? >> any).repeat >> str(']') }
  rule(:link_href) {
      str('(#') >> (str(')').absent? >> any).repeat.as(:id) >> str(')')
  }
  rule(:link)      { link_text >> link_href }
  rule(:non_link)  { (link.absent? >> any).repeat }
  rule(:content)   { (non_link >> link >> non_link).repeat }

  root(:content)
end
```

"Foul," you cry, "this is much more complicated than a regular expression!" And I reply "Yes, but it is also more intelligible long-term as you build upon it." You don't look completely satisfied, but you'll continue reading.

It is worth noting that everything has a name:

* link_text encompasses everything between the two brackets in the markdown link.
* link_href is the content within the parens. Because we are specifically linking only to anchors, we also include the # and then we'll name the id we're linking to via `as`.
* link is just link_text + link_href
* non_link is anything that isn't a link. It could be other markdown or plain text. It may or may not actually contain any characters at all.
* content is the whole markdown content. We can see it is made up of some number of the following: non_link + link + non_link

We've specified that "content" is our root so the parser starts there.

## The Scratch: Adding the 3 missing features

Now we have an easy way to extract links from sections within a story. We'll be able to leverage this to map the branches and solve all three problems.

But in order to break the larger story into sections we'll need to write a StoryParser which can parse an entire story file (for an example file, see [the previous post][previous-post]). Again, this [was TDD'ed][story-parser-spec], but we'll cut to the chase:

```ruby
class StoryParser < Parslet::Parser
  rule(:space) { match('\s').repeat }
  rule(:newline) { match('\n') }

  rule(:heading) { match('^#') >> space.maybe >> (match['\n{'].absent? >> any).repeat.as(:heading) >> id.maybe }
  rule(:id)      { str('{#') >> (str('}').absent? >> any).repeat.as(:id) >> str('}') }
  rule(:content) { ((id | heading).absent? >> any).repeat }
  rule(:section) { (heading >> space.maybe >> content.as(:content) >> space.maybe).as(:section) }

  rule(:tile_block) { (str('%') >> (newline.absent? >> any).repeat >> newline).repeat }

  rule(:story) { space.maybe >> tile_block.maybe >> space.maybe >> section.repeat }

  root(:story)
end
```

Now we can parse out each section's heading text, id, and content into a tree that looks something like this:

```
[
  {:section=>{
    :heading=>"Something isn't right here. "@51,
    :id=>"intro"@81,
    :content=>"You hear a phone ringing.\n\n- [pick up phone](#phone)..."@89}
  },
  {:section=>{
    :heading=>"You pick up the phone... "@210,
    :id=>"phone"@237,
    :content=>"It is your grandmother. You die.\n\n- [start over](#intro)"@245}
  },
  ...
]
```

"That's well and good," you say, "but how do we turn that into something useful?"

Enter Parslet's Transform class (and exit your remaining skepticism). [Parslet::Transform][transform] takes a tree and lets you convert it into whatever you want. The following code takes a section tree from above, cleans up some whitespace, and then returns an instantiated Section class based on the input.

```ruby
class SectionTransformer < Parslet::Transform
  rule(section: subtree(:hash)) {
    hash[:content] = hash[:content].to_s.strip
    hash[:heading] = hash[:heading].to_s.strip

    if hash[:id].to_s.empty?
      hash.delete(:id)
    else
      hash[:id] = hash[:id].to_s
    end

    Section.new(hash)
  }
end
```

Example of an instantiated [Section][section]:

``` ruby
p SectionTransformer.new.apply(tree[0])
# <Section:0x007fd6e5853298
#  @content="You hear a phone ringing.\n\n- [pick up phone](#phone)\n- [do not answer](#ignore-phone)\n- [set yourself on fire](#fire)",
#  @heading="Something isn't right here.",
#  @id="intro",
#  @links=["phone", "ignore-phone", "fire"]>
```

So now we have the building blocks for parsing a story into sections and then our Section class internally uses the LinkParser from above to determine where the section branches outward.

Let's finish this by encapsulating the entire story in a Story class:

``` ruby
class Story
  attr_reader :sections

  def initialize(file)
    @sections = parse_file(file)
  end

  def branches
    @_branches ||= BranchCruncher.new(@sections).traverse
  end

  def reachable
    branches.flatten.uniq
  end

  def unreachable
    @sections.map(&:id) - reachable
  end

  def split!(path)
    branches.each do |branch|
      File.open(path + branch.join('-') + '.md', 'w') do |f|
        branch.each do |id|
          section = sections.detect{|s| s.id == id}
          f.puts "# #{section.heading} {##{section.id}}\n"
          f.puts section.content
          f.puts "\n\n"
        end
      end
    end
  end

  private

  def parse_file(file)
    SectionTransformer.new.apply(StoryParser.new.parse(file.read))
  end
end
```

A few notes:

* You instantiate the Story class with a File object pointing to your story.
* It parses out the sections
* Then you can call methods to fill in the missing pieces of functionality we identified at the beginning of this post.

``` ruby
# Which sections are orphaned?
p story.unreachable
# => ['some-unreachable-page-id']

# What branches are there in the book?
p story.branches
# => [ ["intro", "investigate", "help"], ["intro", "investigate", "rescue", "wake-up"], ["intro", "investigate", "grounded"], ["intro", "grounded"] ]

# Let me read each narrative branch by splitting each branch into files
story.split!('/tmp/')
# creates files in /tmp/ folder named for each section in a branch
# e.g. intro-investigate-help.md
# You can read through each branch and ensure you've maintained a cohesive narrative.
```

If you made it this far, you deserve a cookie and my undying affection. I'm all out of cookies and any I had would be gluten-free anyway, so how about I just link you to the example code instead and we call it even?

Here's the [cyoa-parser on github][cyoa-github]. It includes a [hilariously bad speed-story][smell-ya-later] I wrote for my son when he insisted on a CYOA bedtime story 10 minutes before bed.

If you'd like to learn more about Parslet from someone who knows it better than me, check out [Jason Garber's Wicked Good Ruby talk][garber].

[previous-post]: http://blog.semanticart.com/blog/2014/01/11/writing-hypertext-fiction-in-markdown/
[so]: http://stackoverflow.com/a/1732454
[peg]: https://en.wikipedia.org/wiki/Parsing_expression_grammar
[parslet]: http://kschiess.github.io/parslet/
[more-docs]: http://kschiess.github.io/parslet/contribute.html
[transform]: http://kschiess.github.io/parslet/transform.html

[story-parser-spec]: https://github.com/semanticart/cyoa-parser/blob/master/spec/story_parser_spec.rb
[section]: https://github.com/semanticart/cyoa-parser/blob/master/lib/section.rb
[cyoa-github]: https://github.com/semanticart/cyoa-parser
[smell-ya-later]: https://github.com/semanticart/cyoa-parser/blob/master/examples/smell-ya-later.md

[garber]: http://www.confreaks.com/videos/2730-wickedgoodruby-writing-dsl-s-with-parslet
