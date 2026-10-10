+++
title = "Personal Website"
author = ["emsenn"]
date = 2019-10-16
draft = false
+++

## Introduction {#introduction}

This document contains the configuration, data, and basic content for my personal website, available at [https://emsenn.net](https://emsenn.net).


## Personal Website {#personal-website}

My personal website is implemented using the [Hugo website generator](https://gohugo.io/), using my own [theme](https://emsenn.net/computer-instruction-sets/hugo-personal-website-theme).

This document has sections for the following:

-   The [configuration file](#hugo-configuration) that Hugo and my theme use.
-   Some of the pages on that website. They're exported from their [Org-mode source file](https://code.cyberearth.systems/emsenn/personal-website) into Hugo-compatible Markdown using [Ox-Hugo](https://ox-hugo.scripter.co). Additional pages, like those for my writing, are created by using Ox-Hugo on the appropriate Org-mode file.
-   Local data, such as an array of my recent activities or upcoming plans.

This document is largely just the content and configuration - to see how it is used, you'll want to look at the [theme documentation](https://emsenn.net/computer-instruction-sets/hugo-personal-website-theme/).


### Hugo Configuration {#hugo-configuration}

This section contains the configuration I use for Hugo. To learn more about how any of these variables are used, read the documentation for the applied [Hugo theme](https://emsenn.net/computer-instruction-sets/hugo-personal-website-theme/).

<a id="code-snippet--config.toml"></a>
```toml
baseURL = "https://emsenn.net"
languageCode = "en-us"
enableEmoji = true
title = "emsenn"
author = "emsenn"
theme = ["hugo-personal-website-theme"]
[params]
  email = "emsenn@emsenn.net"
  tribalHeritage = "Itázipčho (Sans Arc of the Lakota Sioux)"
  genderIdentity = "cis man"
  mainPages = ["contact", "support"]
  mainSections = ["catechisms", "collections", "computer-instruction-sets", "directives", "essays", "fictions", "formal-documents", "games", "guidebooks", "journal-entries", "letters", "logs", "media-criticisms", "poems", "radioplays", "records", "stories", "transcripts", "writing-exercises"]
  makeVerb = "am teaching myself about"
  makeThings = ["[eco-industrialism](https://emsenn.net/eco-industrialism/)", "community organization"]
  makeFocus = "their potential to address our climate crisis"
  showHCard = true
  properName = "emsenn"
  pronounNominative = "they"
  pronounOblique = "them"
  pronounPossessive = "theirs"
  honorificPrefix = "M"
  canonicalURL = "https://emsenn.net"
  nickname = "emsenn"
  logo = "/imgs/emsenn-logotype.png"
  logoAlt = "The text '(ems), representing emsenn's logotype."
  givenName = "Morgan"
  familyName = "Sennhauser"
  locality = "Chapel Hill"
  region = "North Carolina"
  country = "United States of America"
  traditionalSovereignty = "Shoccoree"
  phoneNumber = "18143673660"
  photoUrl = "imgs/emsenn-logotype.png"
```


#### Built-in Variables {#built-in-variables}

The following variables come at the start of the configuration file, and are built-in to Hugo.


##### `baseURL` {#baseurl}

Available in templates through `.Site.BaseURL`.


##### `languageCode` {#languagecode}

Available in templates through `.Site.LanguageCode`.


##### `enableEmoji` {#enableemoji}


##### `title` {#title}


##### `author` {#author}


##### `email` {#email}


##### `theme` {#theme}


#### Theme Parameters {#theme-parameters}


##### `mainPages` {#mainpages}

Available through `.Site.Params.mainPages`, this list of strings indicates which pages are considered "main" on my website.


##### `mainSections` {#mainsections}


##### `makeVerb` {#makeverb}


##### `makeThings` {#makethings}


##### `makeFocus` {#makefocus}


##### `showHCard` {#showhcard}


##### `properName` {#propername}


##### `honorificPrefix` {#honorificprefix}


##### `canonicalURL` {#canonicalurl}


##### `nickname` {#nickname}


##### `logo` {#logo}


##### `logoAlt` {#logoalt}


##### `givenName` {#givenname}


##### `familyName` {#familyname}


##### `locality` {#locality}


##### `region` {#region}


##### `country` {#country}


##### `phoneNumber` {#phonenumber}


##### `photoURL` {#photourl}


### Native Content {#native-content}

The following sub-sections each represent a page on my website.


#### My name is emsenn {#my-name-is-emsenn}


#### Contact Information {#contact-information}

**_In a hurry?_** Send an email to [emsenn@emsenn.net](mailto:emsenn@emsenn.net).

**_Representing a government?_** Check my [legal disclosures and policies](../../../../../../../../../../../../../science-services-section/services/history-and-archaeology-science-services-section/content/text/documents/articles/notes/undated/legal.md).

**_Want to give me money?_** I have a page for [receiving financial support](/support).

Other communication channels are explained below.

<div class="ox-hugo-toc toc local">
<div></div>

- [Personal and Private](#personal-and-private)
    - [Email](#email)
    - [Matrix](#matrix)
- [Public](#public)
    - [Microblogging](#microblogging)

</div>
<!--endtoc-->


##### Personal and Private {#personal-and-private}


###### Email {#email}

You can **_send me an email_**.  My private email is [emsenn@emsenn.net](mailto:emsenn@emsenn.net).


###### Matrix {#matrix}

I have an account on the Matrix homeserver at @emsenn:matrix.org. (I also run a small collection of channels, email me for details.)


##### Public {#public}


###### Microblogging {#microblogging}

I'm active within the _Fediverse_, a network of communication platforms. My main account is at [@emsenn@tenforward.social](https://tenforward.social/@emsenn).


#### Support {#support}

I release as much of my work as I can for the _benefit of the commons_, so that anyone can use and change it however serves them best. That is made possible with financial contributions from humans like you. Thank you!

I currently accept support through the following platforms:

-   One-time through...
    -   [Paypal](https://www.paypal.me/emsenn)
    -   [Ko-fi](https://ko-fi.com/emsenn)
-   Recurring through...
    -   [Liberapay](https://liberapay.com/emsenn/donate)

If there is another service through which you'd like to contribute, please [send an email](mailto:emsenn@emsenn.net). **_Please note,_** as my work is released into the public domain, financial contributions do not provide access to any "exclusive" content.


#### Services {#services}


##### Services Listing {#services-listing}


##### Tarot Reading {#tarot-reading}

I think **_tarot readings_** can be a wonderful problem-solving tool,
regardless of the beliefs of anyone involved: they're a great way for
_framing a question in a unique way_.

I've structured my tarot readings like my other consultation sessions: you can click the
button below to fill out a short form to apply.  If my service seems like a good fit, we
can schedule your session.  Otherwise, I'll try to refer you to more useful information.

Generally, I consider a tarot reading to be most useful when you _feel_ like you're
struggling with something, but can't seem to _think_ clearly about the problem.

If I accept you for a session, it'll take 30 to 40 minutes.  We'll meet through an online
video conference, but you don't have to use your microphone or video if you don't want.
Afterward, you'll get a brief reporting on the cards that were drawn, and a recording of
the session.

> "I wasn't interested in any of the mysticism behind tarot, but it didn't matter: emsenn's
> reading still helped me understand why I was butting heads with my coworker." --
> Anonymous Client

To apply for a session, please [send an email](<mailto:emsen@emsenn.net>) containing the
following information:

-   Some **_personal information_**: the _name_ you'd like me to call you, and the _pronouns_
    you'd like me to use in reference to you.
-   A mention of **_this service_**: Put _Tarot Reading_ as your email's subject, or include
    it prominently in the body.


#### Follow Fridays {#follow-fridays}


##### 2019 {#2019}


###### 2019-07 July {#2019-07-july}

-    2019-07-05

    -   [@Kris@tabletop.social](https://tabletop.social/@Kris) is doing some interesting fantasy world-building stuff.
    -   [@ardydo@masto.donte.com.br](https://masto.donte.com.br/@ardydo) makes cool games that they share at [https://ardydo.itch.io/](https://ardydo.itch.io/).
    -   [@darius@friend.camp](https://friend.camp/@darius) cares about how we talk online; recently he released his instance's fork of Mastodon called [Hometown Fork](https://github.com/hometown-fork/hometown).


###### 2019-06 June {#2019-06-june}

-    2019-06-28

    -   [@twee@patch.cx](https://patch.cx/users/twee) has reasonable opinions about technology.
    -   [@\_emacsomancer@linuxrocks.online](https://linuxrocks.online/@%5Femacsomancer) has an interest in Old English and Emacs.
    -   [@maloki@elekk.xyz](https://elekk.xyz/@maloki) is involved with the communities of several ActivityPub-federated platforms and boosts a lot of commentary about contemporary issues within the communities using those platforms.

-    2019-06-21

    -   [@acciomath@mathstodon.xyz](https://mathstodon.xyz/@acciomath) is a young person about to enter an American university to study mathematics, and I like reading out how much thought they're putting into making sure they get something out of that education. More personally, I'm advocating they adopt a similar _Emacs_ + _Org-mode_ workflow to me.
    -   [Julio Biason](https://functional.cafe/@juliobiason) just wrote a bunch of blog posts about what they've learned with their three-decades working as a computer programmer. A lot of it seemed obvious to me as a hobbyist, but it's all being taken as very insightful by long-time professionals, so I think it'll be interesting to mull over why I perceive it so differently.


###### 2019-01 January {#2019-01-january}

-    2019-01-19

    -   [@IgnaceK@mastodon.social](https://mastodon.social/@IgnaceK), a real life friend of mine.
    -   [@starbreaker@pleroma.site](https://pleroma.site/@starbreaker), posts interesting stuff about writing and tech
    -   [@staticsafe@mastodon.zombocloud.com](https://mastodon.zombocloud.com/@staticsafe), posts cool stuff about tech and the people who use it.
    -   [@kaushalmodi@mastodon.technology](https://mastodon.technology/@kaushalmodi), always helpful with my Emacs questions.


#### Reviews {#reviews}


##### Of My Writing {#of-my-writing}

> "I am really enjoying [emsenn's writing] which talks about organisation, activism, org-mode, LISP, Free Software and related issues in great detail, with great clarity and, it seems to me, a unified underlying vision. I don’t agree with everything they write, but each post has strong arguments and makes me think." - Reinder Dijkhuis, [Linklog for June 29, 2019](http://reinderdijkhuis.com/wordpress/2019/06/29/linklog-for-june-29-2019-massive-link-dump/)

<!--quoteend-->

> "reading emsenn's [I Cannot Trust Post-Modern Conservatives](https://emsenn.net/essays/i-cannot-trust-post-modern-conservatives/) and I keep nodding along and being impressed with the clarity of their writing. I've been one of those people that didn't have any beliefs and just wanted to argue but then I stopped being a dumb teenager" - [@y0x3y@hackers.town](https://hackers.town/@y0x3y)


#### Legal Disclosures and Policies {#legal-disclosures-and-policies}

My legal policies aim to balance enabling my own freedom of action with the requirements placed on me by the law. Depending on the action, this balance may be difficult to determine. Please, **assume naivety and ignorance rather than malice:** explaining to me my fault and nicely requesting a change is more likely to receive a prompt response than sending legal threats.


##### Handling Legal "Threats" {#handling-legal-threats}

Legal "threats" are indications that a party wishes to take legal action against me, without an appropriate justification. I reserve the right to publish and expose all legal threats made against me. They will be considered an attempt to harm me by abusing the legal system, and I will respond accordingly.


##### Doe Subpoenas {#doe-subpoenas}

If compelled by a Grand Jury, I may be required to disclose information about private correspondence and communications using a [Doe subpoena](http://en.wikipedia.org/wiki/Doe%5Fsubpoena).


##### Gag-Order Subpoena {#gag-order-subpoena}

I will not recognize or respect unlawful gag-order subpoenas from Grand Juries which do not have the legal right to do so, and any unlawful gag-order will be considered a legal threat. Subpoenas on which the "gag" is permanently (explicitly never expires) or indefinite (say they will expire upon further court order) are unlawful.

What follows is a warrant canary - the text between "Begin warrant canary" and "End warrant canary" may be an [indication](https://en.wikipedia.org/wiki/Warrant%5Fcanary) of my receipt of legally "gagged" subpoenas.

Begin warrant canary

End warrant canary


##### Digital Millenium Copyright Act {#digital-millenium-copyright-act}

I must follow the Digital Millenium Copyright Act. If you believe I am distributing copyright-protected work without authorization, **and you are the owner of the copyright, or authorized to act on their behalf**, you may contact me:


#### Listing Descriptions {#listing-descriptions}


##### Catechisms {#catechisms}

These **_catechisms_** are questions-and-answers intended to teach others how my [personal directives](/directives) influence my holistic philosophy.


##### Collections {#collections}

These pages contain **_collections_** of information about a specific topic, such as reading lists, poetry books, and cookbooks.


##### Directives {#directives}

This collection of _directives_ are a **_living_** _document_: it is subject to continued change and amendments.

These **_directives_** are guidelines for how I approach choices in my life.

These _directives_ cover a subject which is **_difficult_**: the language used may have flaws and may not accurately convey my intentions. It is suggested you assume I wrote the piece honestly and with sincere intentions.

Missing _directives_ are private, but no less important than those which I publicize.


##### Computer Instruction Sets {#computer-instruction-sets}

These are collections of **_computer instruction sets_**: statements in a programming language (or several) gathered together to enable a certain task (or set of tasks.)


##### Essays {#essays}

These are **_essays_** I've written at various times, about various topics.


##### Games {#games}

These **_games_** are things I've made for folk to play. Have fun!


##### Guidebooks {#guidebooks}

These **_guidebooks_** are manuals for how I do the things I do. Not necessarily the things I do well, either.


##### Journal Entries {#journal-entries}

These **_journal entries_** are long-form descriptions of my activities or plans for a period of time.


##### Logs {#logs}


##### Poems {#poems}

These **_poems_** are bits of writing that I wrote.


##### Radioplays {#radioplays}

These **_radioplays_** are scripts for audio-based stories.


##### Transcripts {#transcripts}

These **_transcripts_** are the written or digitized form of a spoken or analog text.


##### Writing Exercises {#writing-exercises}

These are writing exercises I've completed.


#### Now {#now}


#### Plans {#plans}


#### Collections {#collections}


##### Autonomous Collectives {#autonomous-collectives}

This page is a collection of autonomous collectives I'm aware of: people who are currently living "in anarchy." Some of these collectives are just a couple people, some consist of tens-of-thousands. If you have a recommendation for this list, please email [emsenn@emsenn.net](mailto:emsenn@emsenn.net).


###### 100 Rabbits {#100-rabbits}

100 Rabbits is a "traveling design studio on a sailboat." Read more on
their [website](https://100r.co/).


###### Internationalist Commune of Rojava {#internationalist-commune-of-rojava}

The Internationalist Commune of Rojava was organized in early 2017 to plan a future for a decolonized Africa and Middle East. Read more on their [website](https://internationalistcommune.com/). As of October 10th, 2019, Turkey has been engaged in military action against the defensive militias of Rojava.


###### Vila Eloíse {#vila-eloíse}

Vila Eloíse is a "small queer rural house at Galiza (northwest of Spain)," which focuses on providing a space safe to traveling LGBTQIA+ individuals, additionally providing artistic working spaces. Read more about them at their [blog](https://vilaeloise.home.blog), and follow their [microblog at queer.party](https://queer.party/@vilaeloise).


###### Youth Anarchist Collective of Cape Town {#youth-anarchist-collective-of-cape-town}

Founded in the fall of 2019, the YAC-CT is "a small youth organisation in the Platformist tradition based on advocating for anarchist-communist solutions to the issues faced by South Africa." Read more about them through their self-maintained [profile on RiseUp](https://we.riseup.net/yac-ct/about-us), and follow their [microblog at anarchism.space](https://anarchism.space/@yac%5Fct).


#### Eco-Industrialism {#eco-industrialism}

It is not necessary that our society depend on constant consumption and growth to flourish. I believe we can restructure ourselves to work in cooperation with our global ecology, instead of through its exploitation.


##### What is "eco-industrialism"? {#what-is-eco-industrialism}

**_Eco-industrialism_** is a label for my social philosophy. It recognizes that:

1.  Humans must produce for themselves, food and goods, in order to live.
2.  Such production requires consumption.
3.  If we consume all our resources, we can't keep producing, so we can't keep living. (We'll go extinct.)
4.  So, human consumption needs to be sustainable.

It is an extension of the concepts prevalent in sustainable agriculture to all fields of human labor.


##### Why eco-industrialism? {#why-eco-industrialism}

Our social institutions are led by our existing industrial institutions: capitalistic conglomerate corporations. These corporations, liable to their shareholders, must work to secure greater profit. This pursuit of profit has led to decisions which have exploited our environment, causing a global harm to our ecology that is accelerating in severity.

We must restructure our means of industry so that sustainable use of our environment is prioritized over profit. Local democracies operating in confederation via recallable delegates (industrial unionism) seems like the only way to achieve that level of accountability, regardless of our level of technology or infrastructure.


##### How would we implement eco-industrialism? {#how-would-we-implement-eco-industrialism}

I am not sure. My notions of eco-industrialism intersect with the concepts of industrial unionism and eco-socialism, so their means are likely to be in-line with mine: removing support for exploitative industries while building democratic ones.


##### Where can I learn more? {#where-can-i-learn-more}

Here's some relevant Wikipedia articles:

-   [Agroecology](https://en.wikipedia.org/wiki/Agroecology) is sometimes used to refer to a synonymous philosophy, but has also been widely used to refer to a less-philosophical approach to industrial agriculture, and rarely extends outside agricultural industries.
-   [Eco-socialism](https://en.wikipedia.org/wiki/Eco-socialism) isn't inherently similar as a philosophy, however many of the means they recommend overlap with mine. Eco-socialism does not always imply such a focus on democratic institutions, for example, but they do advocate for sustainable industries.
-   [Industrial unionism](https://en.wikipedia.org/wiki/Industrial%5Funionism) is one method of achieving democratic workplaces, and one I advocate for.


### Native Data {#native-data}

The following data


#### Activities {#activities}

```toml
[activities]
2019-10-16 = ["wrote about [eco-industrialism](eco-industrialism)"]
2019-09-27 = ["planted my fall vegetables"]
2019-09-21 = ["attended a protest against UNC-CH's coal cogeneration plant"]
2019-09-20 = ["attended a climate crisis protest in Chapel Hill"]
2019-08-18 = ["joined the Raleigh-Durham branch of the I.W.W."]
2019-07-14 = ["added an [h-card](http://microformats.org/wiki/h-card) to my [homepage](https://emsenn.net)"]
2019-07-08 = ["wrote and released [Curated Thoughts on FOSStodon](/essays/curated-thoughts-on-fosstodon/), about a contemporary situation involving the intersection of the kyriarchy and free software communities"]
2019-07-07 = ["released an older essay, [A Few Bad Apples](/essays/few-bad-apples/), about why I judge all police for the actions of a few"]
2019-07-06 = ["wrote [There and Back Again (A Fediverse Journey)](/essays/there-and-back-again-a-fediverse-journey/)", "added my essays to my website"]
2019-06-09 = ["started re-doing my personal site in _Hugo_"]
[plans]
current = ["improving my personal website by joining the [IndieWeb](https://indieweb.org/)", "growing my local branch of the [I.W.W.](https://iww.org)"]
soon = ["serialize my tragically funny fantasy world, Teraum", "write an interactive fiction in which you're an artificial intelligence tasked with making widgets"]
```


#### Plans {#plans}

```toml
soon = [
  "Improve this website: join the ",
]
```


### Remote Data {#remote-data}


#### Webrings {#webrings}


##### Writers of the Fediverse {#writers-of-the-fediverse}


## Local variables {#local-variables}