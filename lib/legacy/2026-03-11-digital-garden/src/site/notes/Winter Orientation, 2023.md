---
{"dg-publish":true,"permalink":"/winter-orientation-2023/","created":"[[2023-11-14]]"}
---

I'm writing this Letter to the Web in a different software than I normally use.
Rather than using Emacs, an old-school text-editor on Linux, I'm using [4theWords](https://4thewords.com/), a browser-based word processor that has gamification features added on.
For example, I currently have 24 hours, 26 minutes, and 20 seconds to write an additional 1608 words, in order to defeat something called a Mertino, as part of the game's annual NaNoWriMo challenge.

This is part of an ongoing shift in what technology I'm using on a computer, in response to the changing present and future.
Yup - this is going to be another Letter where I talk vaguely about what I'm doing and what I plan to do, with computers.
I'll put that after the paid subscriber break, but for now, I'd like to share a couple garden updates.

Not subscribed?
Most Letters are free-to-read.

First, we've put in a fall crop of potatoes.
Even though El Nino is settling in (which here means generally colder and drier winters), I'm still pretty confident that we're going to be able to get a decent crop in.
We've set up "hotbeds" using containers filled with compost, arranged to form a larger hotbed in the space between themselves.
We’ve also got more onions, peas, rye, and wall-rocket going.

[

!
[A photograph of some onion bulbs and pea seeds resting on soil.]
(https://substackcdn.com/image/fetch/w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9c9079cb-580d-44d3-9c0f-03d577ccf7d1_4640x3480.jpeg "A photograph of some onion bulbs and pea seeds resting on soil.")

](https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F9c9079cb-580d-44d3-9c0f-03d577ccf7d1_4640x3480.jpeg)

A couple onions couldn’t wait to start rooting!

We're also continuing to pull in a good amount of saffron each day, which is exciting: it's looking like we'll have enough to share!
And, our rye and peas are coming in decently.
A reminder that all this happening in a backyard garden that we're going to be relocating in the spring, to an as-yet-undecided location.
(We've got a couple opportunities lining up, including potentially sharing land ownership.
Any [contributions](https://ko-fi.com/emsenn) would be helpful toward these goals, or backup plans.)

We're also building up a stockpile of dehydrated mushrooms foraged from nearby: turkey tail, puffball, and boletes.
We're farming oyster mushrooms ourselves; right now they're not fruiting but we're bulking out a tremendous amount of substrate - if certain opportunities come through, we might be at the Durham Farmers Market as soon as next fall, selling mushrooms and other things.

I've also, personally, been doing more to reconnect with some of the folk I was talking to before my days became as silly as they did.
I still need to get the profiles set up, but I'm back on the Fediverse at @emsenn@turtleisland.social for microblogs, @emsenn@turtleisland.art for photos, and @ecoemsenn@turtleisland.video for videos.
I'm also @emsenn on 4theWords if anyone else is using that.

In order to help get us back toward the orientation we want, me and my partners have also been looking at [Habitica](https://habitica.com/), a gamified task management application, that we're using to cultivate the habits we want, like stretching and composting, but also using to make sure we're putting as much effort into those things each day as we want, and using it more generally to track things we need to do.

4theWords and Habitica are both very different softwares than I normally use - they're online-only, they have paid subscription elements, so on.
Far from the terminal-based open-source stuff I usually use.

The issue is, I've been so distant from using computers in what I'd consider a good way, that using what I'd consider better tools didn't really matter - especially because I wasn't ever getting closer to building the software I actually want, a generalized MUD engine.

So, I decided to switch to software that's a little more fun, stuff with an easy app I can carry on my phone, and just two pieces of software: one for tracking what I am doing or wanna do, and one for babbling about it.

Which is not different than what I was using Emacs for, except that I was never finding the time to set up InfoPonEmacs enough to just use it.
Accepting Habitica and 4theWords as stopgaps that let me do the sort of work I _need_ to do, now, well enough, I'm making the space to work on a MUD engine.

So, that's my winter orientation: improving our stockpile of biotic resources like soil and mushroom substrate, while using 4theWords and Habitica to do minimal recordkeeping on it, while looking at how to set up the MUD engine that I want.
The rest of this Letter, after the break, will talk a bit about what my plan is for that.

(Oh - and me and my partners are planning on sharing our Habitica habits, once we can, for those of y'all who wanna play along with our praxis at home.
Just, fully leaning into the "lifestyle anarchist" label folk put on us.
Whatever.)

[

!
[A photograph of rye seed laying on soil.]
(https://substackcdn.com/image/fetch/w_1456,c_limit,f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F0cfedb15-dbe1-4844-9c87-23d8052e6a19_4640x3480.jpeg "A photograph of rye seed laying on soil.")

](https://substackcdn.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F0cfedb15-dbe1-4844-9c87-23d8052e6a19_4640x3480.jpeg)

An old meme: “Want some rye? ‘Course ya do.”

So, y'all who've been subscribers for a while are either tired, or will never get tired, of hearing me talk about my plans for a MUD engine.
And a few of you might've even gotten to play a couple early versions of things.
Most recently I was writing the the code in Fennel, because I really like LISP as a syntax, but as I'm revisiting the Web, I'm realizing that - and thi is something I don't really want to indulge in complaining about right now - that much as I feared and predicted, the concurrent centralization and decentralization of the Web have facilitated the entrenchment of late liberal culture within it.
I know that philosophical jargon that either makes sense on its face or doesn't, but the basic idea is that, in my belief - and the belief of a few other folk - there can't be liberatory software if that software does not come from a perspective that holds a few key values.
That is something, in fact, a lot of people agree with, and is exactly what leads them to make decentralized sfotware the way they do - they believe the software must represent certain core valeus, such as free speech and association - if it is going to be of any use to their idea of liberation.

Where I generally lose people is that I believe the core value that such sociocultural software is nihilism.
In fact, most of the time, I only need to say a sentence like that one to get a very long explanation of why I am very wrong, using an understanding of nihilism that has very little resemblance to what I, or any other nihilist texts or people, talk about.

What I'm trying to get across with my appeal to holding nihilism as a value when engaged in interpersonal activities, in this case specifically using computers for communication and planning, is that unless folk want the software to become an additional party to the conversation, the software has to let them give their own meaning to the things the software is bringing: its ability to hold memory of complex relations and functions.

In practice I think this means making software that really blurs the line between user and developer, and what is back- and front-end, in a way that I remember being more common when I was very young, and quickly faded with the commercialization of the Web.
I've talked at length about this in other Letters and other Places, so I'm not going to explain the theory more deeply here.

What I am going to explain is that, looking around at the Web, it is clear that there is a greater interest in this type of project than before, when it felt like the only interest I got was from overly-academic techbros who enjoyed playing devils advocate in their spare time.
Now, it feels, people are a little more understanding of why I want a computer that can not only help me track how many potatoes I've planted versus how many I've harvest, but lets me define what a potato means to the people counting it: what a potato can do, how it relates to the onions, how the potatoes and onions relate to the kitchen.
How this can turn into helping the cook know how long they've gotta plan on prepping ingredients today, if they wanna use everything that the garden harvested yesterday.

It's funny, when I explain such a generalized ledger to non-computer folk, they tend to express that it is similar to what they want a computer to be, and express surprise that it is computers relationship to our culture that has prevented these tools from existing so far.

And when I express such a generalized ledger to computer folk, they express that while such a thing would be nice, no one would actually use it because people will just buy food at the store, there's enough (artificial) abundance that anything that actually cares about resources just isn't useful.

But, both of these things are changing, as Collapse unfolds.
Consumers are looking at the things around them with a new eye, the eye of someone who realizes they will have to produce outside of economic terms if they want to increase their resilience.
And computer folk are feeling the reality of extraction-induced scarcity and beginning to wonder if these machines made by the most extractive parts of our economy might be able to help address those problems.

Unfortunately, most of these folk are still settlers, so think that if they are realizing these things now, it means something in the world has changed, not that they have become more aware of how the world has been.
And since they are addressing something new, they don't really take time to look around for what might already be addressing it.
And that's where we are now: a bunch of people coming to an old problem as though they're the first - or among the first - to see it - and so are striking off on their own to solve it.

They'll form little cliques and those that live closest the norms of colonialism will see more support and those become the adaptation that the dominant culture moves toward, and the too-slow March of Progress will continue.

I... just want to have my little software.
I might, in fact, need something like it, by next fall, if we want to be stewarding land productively enough to commercialize some of the abundance.
Otherwise, we'll have to use the tools others have made, and we know those come with their own values.

So - and I hate this - I'm going to look at a couple of the Large Language Model softwares built for helping folk write code, and see if I can't use one of those to help me build out enough of those software that I can start applying it to what we're doing here and now, with the mushrooms and soil and stuff.
It isn't that there haven't been a few folk willing to help, but they all have their own lives and stuff.
I wanna take what I'm able to sketch out with these tools, form it into a more proper Github project, and then bring that to the Web, in whatever form is considered good for a FOSS project, and then try and do a marketing stint for it, that'll also be a marketing stint for the homestead we'll be running with it.

From there, with something that has a relationship to our work, I think, even if we gut the core code and redo it, we'll be working from a better base to get actual collaboration.
Or, we'll at least have some practice working with the AI and can use that to get it to the point we can keep hacking away at it offline for a generation or two, as Collapse unfolds.
