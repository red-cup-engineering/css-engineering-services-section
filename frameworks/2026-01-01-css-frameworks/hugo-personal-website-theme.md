+++
title = "Hugo Personal Website Theme"
author = ["emsenn"]
date = 2019-10-15
tags = ["CSS", "HTML", "Hugo"]
draft = false
+++

<div class="ox-hugo-toc toc">
<div></div>

<div class="heading">Table of Contents</div>

- [Introduction](#introduction)
- [Hugo Personal Website Theme](#hugo-media-package-channel-generator)
    - [Overview](#overview)
    - [Operations](#operations)
    - [Theme Configuration](#theme-configuration)
    - [Expected Site Configuration](#expected-site-configuration)
    - [Page Templates](#page-templates)
    - [Partial Templates](#partial-templates)
- [Supplements](#supplements)
    - [Index](#index)
    - [README](#readme)
    - [Source](#source)

</div>
<!--endtoc-->


## Introduction {#introduction}

This Hugo theme was created by emsenn, was last released on 2019-10-15, and is currently on version 0.1.0.

It is an implementation of a Hugo Theme for creating a _personal website_: a website catered around presenting information about a person. Hugo is a static site generator written in Go.

The theme is written primarily for my personal use, on [https://emsenn.net](https://emsenn.net).

My website contains information about me, a collection of my writing, and my various projects. My goal is to provide all that information with enough other information that folk can get a more holistic understanding of it.

This theme is in early development and poorly documented, but I have big aspirations for it.


## Hugo Personal Website Theme {#hugo-media-package-channel-generator}

<div class="ox-hugo-toc toc local">
<div></div>

- [Overview](#overview)
- [Operations](#operations)
- [Theme Configuration](#theme-configuration)
- [Expected Site Configuration](#expected-site-configuration)
- [Page Templates](#page-templates)
- [Partial Templates](#partial-templates)

</div>
<!--endtoc-->


### Overview {#overview}

This theme provides templates[^fn:1] for generating a static website with the Hugo static site generator. It's currently in-development, so the documentation, where present, is bad, and the code is even worse.

This is an ambitious theme: it currently is fed data from exported version of most of my source code and writing, in addition to some native content and data, and I have plans to pull in some remote data as well.


### Operations {#operations}

<div class="ox-hugo-toc toc local">
<div></div>

- [Install the Theme](#install-the-theme)

</div>
<!--endtoc-->


#### Install the Theme {#install-the-theme}


##### Install with Git {#install-with-git}

**_Coming soon!_**


##### Install from Source {#install-from-source}

This theme's source exists as an _Org-mode_ document. The best way to work with it, then, is by editing that document, in _Emacs_. Then, you can use Babel to "tangle" the Hugo templates and such into their proper files. Edit the _Org-mode_ file and then re-"tangle" the document to create fresh source files.


### Theme Configuration {#theme-configuration}

The configuration below _tangles_ to `./build/theme.toml`. Explaining
it in detail is beyond the scope of this document, but if you're changing this theme, you'll probably wanna change this to reflect that. (Especially if you plan on sharing the theme; I don't want to be receiving credit for your code!)

```toml
name = "Hugo Personal Website Theme"
license = "CC0"
[author]
  name = "emsenn"
  homepage = "https://emsenn.net"
```


### Expected Site Configuration {#expected-site-configuration}


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

Used by the ["Site Main Pages Span"](#site-main-pages-span) HTML partial template.


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


### Page Templates {#page-templates}

This section contains the different page _layouts_.

<div class="ox-hugo-toc toc local">
<div></div>

- [HTML Page Templates](#html-page-templates)

</div>
<!--endtoc-->


#### HTML Page Templates {#html-page-templates}

<div class="ox-hugo-toc toc local">
<div></div>

- [404 Page Layout](#404-page-layout)
- [Basic Page Layout](#basic-html-template)
- [Index Page Layout](#index-page-layout)
- [List Page Layout](#list-page-layout)
- [Single Page Layout](#single-page-layout)
- [Webring Layouts](#webring-layouts)
- [TODO Log Page Layout](#todo-log-page-layout)
- [Unique Pages](#unique-pages)

</div>
<!--endtoc-->


##### 404 Page Layout {#404-page-layout}

This template is used to render the 404 error page.

<a id="code-snippet--404-layout"></a>
```html
{{- define "header" -}}
  <h1>404: Page Not Found</h1>
{{- end -}}
{{- define "main" -}}
  <article>
    <p>There is no page at this address: this is a <code>404</code> error. You may wish to go to my <a href="{{ .Site.BaseURL }}">homepage</a>. You may also wish to use your browser's Back button to return to the previous page.
    </p>
  </article>
{{- end -}}
```


##### Basic Page Layout {#basic-html-template}

Located at `./layouts/_default/baseof.html`, this template serves as the base for the other HTML page templates.

This template, like a lot of them, relies heavily on partials and conditionals about what configuration or content your site has.

```html
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
{{- with .Site.Language.Lang }} xml:lang="{{- . -}}" lang="{{- . -}}"
{{- end }}>
<head>
{{ partial "head-meta.html" . }}
{{ partial "head-links.html" . }}
{{ partial "head-title.html" . }}
      <style>
      {{ partial "basic-css.css" . | safeCSS }}
      </style>
    </head>
    <body>
      <a class="skipToContentLink" href="#content">Skip to Content</a>
      <article class="h-entry">
	<header>
	  {{- block "header" . -}}
	    {{ partial "header-title" . }}
	    {{ if (eq .Kind "page") }}
	      {{ partial "page-description" . }}
	    {{ else if (eq .Kind "section") }}
	      {{ with .Content }}
		{{ . }}
	      {{ end }}
	    {{ end }}
	   {{- end -}}
	</header>
	<main>
	  {{- block "main" . -}}
	    <!-- -->
	  {{- end }}
	</main>
	<footer>
	  {{- block "footer" . -}}
	    {{ if (eq .Kind "page") }}
	      {{ partial "license-span.html" . }}
	      {{ partial "download-prompt-span.html" . }}
	    {{ end }}
	    {{ partial "solicitation-span.html" . }}
	  {{- end }}
	</footer>
      </article>
    </body>
  </html>
```


##### Index Page Layout {#index-page-layout}

Located at `./layouts/_default/index.html`, this template controls how the website's homepage looks.

If there is no content in the site's `content/_index.md` file, then the HTML partials [Personal Summary Section](#personal-summary-section) and [Site Overview Section](#site-overview-section) are used.

<a id="code-snippet--index-layout"></a>
```html
{{ define "header" }}
  <h1>My name is emsenn</h1>
  This is my website
{{ end }}
{{ define "main" }}
  {{ with .Content }}
    <section>
      {{ . }}
    </section>
  {{ else }}
    {{ partial "personal-summary-section.html" . }}
    {{ partial "site-overview-section.html" . }}
 {{ end }}
{{ end }}
```


##### List Page Layout {#list-page-layout}

Located at `./build/layouts/_default/list.html`, this _layout_ serves
serves as the base for pages that exist to serve lists, like the index
(homepage), or taxonomical list pages, such as those for categories or
tags.

```html
{{ define "main" }}
  {{ partial "pages-listing" . }}
{{ end }}
```


##### Single Page Layout {#single-page-layout}

This is the layout used for any "single" page, which is most any page that isn't providing a listing, like taxonomical pages.

It, like all HTML templates, uses the [Basic HTML Template](#basic-html-template) as its base.

<a id="code-snippet--default-single-document-layout"></a>
```html
{{- define "main" -}}
  {{ with .Content }}
    {{ . }}
  {{ end }}
{{ end }}
```


##### Webring Layouts {#webring-layouts}


###### Writers of the Fediverse Webring {#writers-of-the-fediverse-webring}

```html
{{- define "main" -}}
  {{ with .Content }}
    {{ . }}
  {{ end }}
  {{ $ring := getJSON "http://ring.acdw.net/members" }}
  {{ with $ring }}<ul>{{ range $ring }}
    <li><a href="{{ .href }}">{{ .name }}</a>: {{ .desc }}
      {{ with .fedi }}
	Follow them at <a href="{{ . }}">{{ . }}</a>.
      {{ end }}</li>{{ end }}</ul>{{ end }}
{{- end -}}
```


##### TODO Log Page Layout {#todo-log-page-layout}

```html
{{- define "main" -}}
  {{ with .Params.Tags }}
    {{ range . }}
      {{ . }}
    {{ end }}
  {{ end }}
  {{ with .Content }}
    {{ . }}
  {{ end }}
{{- end -}}
```


##### Unique Pages {#unique-pages}


###### Log Listing {#log-listing}

```html
{{ define "main" }}
{{ with .Content }}{{ . }}{{ end }}
  {{ with .Pages }}
    <ul>
      {{ range .ByDate.Reverse }}
	<li>
	  <a href="{{ .Permalink}}"><strong>
	     {{- .Title -}}</strong></a>
	</li>
      {{ end }}
    </ul>
  {{ end }}
{{ end }}
```


###### Now Page {#now-page}

```html
{{ define "main" }}
<p>My name is {{ partial "who-am-i.html" . }}. {{ partial "personal-whatido-span.html" . }}</p>
<p>
Here's some of what I'm working on now:
</p>
{{ partial "plans-listing.html" $.Site.Data.personalData.plans.current }}
<p>
Here's what I plan to do soon:
{{ partial "plans-listing.html" $.Site.Data.personalData.plans.current }}
</p>
{{ end }}
```


### Partial Templates {#partial-templates}

<div class="ox-hugo-toc toc local">
<div></div>

- [HTML Partial Templates](#html-partial-templates)

</div>
<!--endtoc-->


#### HTML Partial Templates {#html-partial-templates}

<div class="ox-hugo-toc toc local">
<div></div>

- [Solicitation Span](#solicitation-span)
- [License Span](#license-span)
- [Download Prompt Span](#download-prompt-span)
- [Basic CSS](#basic-css)
- [Essay Brief](#essay-brief)
- [H-card](#h-card)
- [H-Card Paragraph](#h-card-paragraph)
- [Head Links](#head-links)
- [Head Meta](#head-meta)
- [Head Title](#head-title)
- [Header Title](#header-title)
- [Page Description](#page-description)
- [Index Menu Listing](#index-menu-listing)
- [Maker Brief](#maker-brief)
- [Pages Listing](#pages-listing)
- [Personal Summary Section](#personal-summary-section)
- [Personal "What I Do" Span](#personal-what-i-do-span)
- [Personal Recent Actions Span](#personal-recent-actions-span)
- [Personal Current Plans Span](#personal-current-plans-span)
- [Personal Soon Plans Span](#personal-soon-plans-span)
- [Plans Delimiter](#plans-delimiter)
- [Plans Listing](#plans-listing)
- [Recent Activities Brief](#recent-activities-brief)
- [Recent Activities Listing](#recent-activities-listing)
- [Recentest Page Brief](#recentest-page-brief)
- [Recentest Page Span](#recentest-page-span)
- [Section Count](#section-count)
- [Site Contents Brief](#site-contents-brief)
- [Site Contents Listing](#site-contents-listing)
- [Site Overview Section](#site-overview-section)
- [Site Main Pages Span](#site-main-pages-span)
- [Site Tags Brief](#site-tags-brief)
- [Site Tags Span](#site-tags-span)
- [Site Main Sections Listing](#site-main-sections-listing)
- [Site Tags Listing](#site-tags-listing)
- [Total Word Count](#total-word-count)
- [Total Fuzzy Word Count](#total-fuzzy-word-count)
- [Webmention Feed](#webmention-feed)
- [Who Am I](#who-am-i)

</div>
<!--endtoc-->


##### Solicitation Span {#solicitation-span}

This partial template provides a `<span>` tag containing a solicitation for donations.

```html
<span class="solicitation">
  This {{ (replace .Type "-" " ") | singularize }} was created with <a href="{{ (printf "%s/support/" $.Site.BaseURL) }}">support</a> from humans like you. Thank you!
</span>
```


##### License Span {#license-span}

This partial template provides a `<span>` tag.

```html
<span class="license">
  This {{ (replace .Type "-" " ") | singularize }} was made by <a href="https://emsenn.net/">emsenn</a> for the benefit of the commons. To the extent possible under law, I have waived all copyright and related or neighboring rights to it.
</span>
```


##### Download Prompt Span {#download-prompt-span}

This partial template provides a `<span>` tag.

```html
<span class="download-prompt">
  If you're viewing this {{ (replace .Type "-" " ") | singularize }} on a remote server, you're encouraged to download your own copy.
</span>
```


##### Basic CSS {#basic-css}

```css
body {
position: relative;
background-color: #eee;
color: #444;
font-family: serif;
margin: 0 auto;
padding-bottom: 6rem;
min-height: 100%;
font-size: 1.2em;
}
header {
font-family: sans-serif;
text-align: left;
margin-left: 1em;
width: 80vw;
overflow: hidden;
margin-bottom: 2em;
padding-bottom: 0.5em;
border-bottom: 0.1em dotted #444;
}
h1, .title { margin: 0.2em 0 0.2em 0; font-size: 3.2rem; }
h2, .subtitle { font-size: 2.2rem; }
main, #content {
width: 85vw;
max-width: 40em;
margin: 0 0 0 1em;
line-height: 1.6;
margin-bottom: 3rem;
border-bottom: 0.1em dotted #444;
}
footer, #postamble {
width: 90vw;
max-width 45em;
margin: 0 0 0 2em;
font-family: sans-serif;
}
section {
border-bottom: 0.1em solid #444;
margin-bottom: 1em;
}
.outline-3 {
border-bottom: 0.1rem dotted #444;
}
blockquote {
padding: 0.5rem;
border-left: 0.1em solid #444;
}
table {
border-collapse: collapse;
border-spacing: 0;
empty-cells: show;
border: 0.1em solid #444;
}
thead { font-family: sans-serif; }
th, td {
padding: 0 0.3em;
border: 0.01em solid #444;
}
img {
max-width: 80vw;
vertical-align: middle;
}
pre, .src {
padding: 0.5em;
border: 0.1em solid #444;
white-space: pre-wrap;
overflow-x: scroll;
text-overflow: clip;
}
dt {
font-weight: normal;
display: inline-block;
border-bottom: 0.1rem dotted #444;
}
#text-index dt { border-bottom: none; }
h2, h3, h4, h5, h6, h7, h8, h9, h10 {
display: block;
font-family: sans-serif;
margin: 0.5em;
}
h2 {
text-align: center;
}
h2 { font-size: 2em; }
h3 {
font-size: 1.8em;
}
h4 {
font-size: 1.6em;
}
h5 {
font-size: 1.4em;
margin: 0.5em 0 0.2em 10%;
}
h6 {
font-size: 1.2em;
margin: 0.5em 0 0.2em 30%;
}
a {
text-decoration: none;
color: #3ac;
display: inline;
position: relative;
border-bottom: 0.1rem dotted;
line-height: 1.2;
transition: border 0.3s;
}
a:hover {
color: #5ce;
outline-style: none;
border-bottom: 0.1rem solid;
}
a:visited { color: #b8c; }
a:visited:hover { color: #dae; }
a:focus {
outline-style: none;
border-bottom: 0.1rem solid;
}
::selection { background-color: #777; color: #eee; }
a::selection { background-color: #ccc; }
.todo {
background-color: #ddd;
color: #333;
font-size: .8rem;
float: right;
}
.org-src-container + .example {
margin-left: 8em;
}
label.org-src-name {
margin: 0 0 0 3em;
font-family: sans-serif;
font-size: 1rem;
line-height: 0;
}
.skipToContentLink {
opacity: 0;
position: absolute;
}
.skipToContentLink:focus{
opacity:1
}
```


##### Essay Brief {#essay-brief}

```html
<a href="{{- .Permalink -}}">{{- .Title -}}</a> is a {{ .FuzzyWordCount -}}-word essay
{{- with .Date }} released on {{ (dateFormat "January 2, 2006" .) -}}{{- end -}}
{{- with .Params.tags }} about {{ range . -}}{{- . | humanize | lower -}}{{- end -}}{{- end -}}.
```


##### H-card {#h-card}

This _partial template_ is for generating an _h-card_, a sort of online "business card." To verify that your _h-card_ is functioning, IndieWeb have provided a validator: [https://indiewebify.me/validate-h-card/](https://indiewebify.me/validate-h-card/)

This _template_

```html
<section class="vcard h-card">
<details><summary>Naming</summary>
  Proper Name: <span class="p-name">{{ $.Site.Params.properName }}</span>
  {{ if (or $.Site.Params.givenName $.Site.Params.familyName) }}
  <table>
    <thead><tr>
      {{ with $.Site.Params.honorificPrefix }}<th>Honorific</th>{{ end }}
      {{ with $.Site.Params.givenName }}<th>Given Name</th>{{ end }}
      {{ with $.Site.Params.familyName }}<th>Family Name</th>{{ end }}
    </tr></thead>
    <tbody><tr>
      {{ with $.Site.Params.honorificPrefix }}<td>{{ . }}</td>{{ end }}
      {{ with $.Site.Params.givenName }}<td>{{ . }}</td>{{ end }}
      {{ with $.Site.Params.familyName }}<td>{{ . }}</td>{{ end }}
    </tr></tbody>
  </table>
  {{ end }}
</details>
<details><summary>Images</summary>
  {{ with $.Site.Params.logo }}
    <dt>Logo</dt>
    <dd><img style="max-width: 3em;" class="u-logo" src="{{ . }}"
	  {{ with $.Site.Params.logoAlt }}
	    alt="{{ . }}"
	  {{ end }}></dd>
  {{ end }}
  {{ with $.Site.Params.photo }}
    <dt>Photo</dt>
    <dd><img style="max-width: 4em;" class="u-photo" src="{{ . }}"
	  {{ with $.Site.Params.photoAlt }}
	    alt="{{ . }}"
	  {{ end }}></dd>
  {{ end }}
</details>
{{ if (or $.Site.Params.canonicalURL $.Site.Params.phoneNumber) }}
<details><summary>Contact Methods</summary>
<dl>
{{ with $.Site.Params.canonicalURL }}
<dt>Homepage</dt><dd><a class="u-url u-uid" rel="me" href="{{ .}}">{{ . }}</a></dd>
{{ end }}
{{ with $.Site.Params.email }}
<dt>Email</dt><dd><a class="u-email" href="mailto:{{ .}}">{{ . }}</a></dd>
{{ end }}
</dl>
</details>
{{ end }}
<details class="adr">
<summary>Physical Location</summary>
	<span class="locality">Chapel Hill</span>,
	<span class="region">North Carolina</span>,
	<span class="country-name">United States of America</span>
      </details>
      </p>
  </section>
```


##### H-Card Paragraph {#h-card-paragraph}

This _partial template_ is for generating an _h-card_, a sort of online "business card." To verify that your _h-card_ is functioning, IndieWeb have provided a validator: [https://indiewebify.me/validate-h-card/](https://indiewebify.me/validate-h-card/)

This _template_...

```html
<p class="vcard h-card">
  {{- with $.Site.Params.givenName -}}
    My given name is
    {{ if (eq $.Site.Params.familyNameFirst true) -}}
      {{- with $.Site.Params.familyName -}}
	<span class="p-family-name">{{ . }}</span>
      {{- end -}}
      {{- with $.Site.Params.givenName -}}
	<span class="p-given-name">{{ . }}</span>
      {{- end -}}
    {{ else -}}
      {{- with $.Site.Params.givenName -}}
	<span class="p-given-name">{{ . }}</span>
      {{ end }}
      {{ with $.Site.Params.familyName }}
	<span class="p-family-name">{{ . }}</span>
      {{- end -}}
    {{- end -}}
    {{- with $.Site.Params.properName -}}
      , but
    {{- end -}}
  {{- end -}}
  {{ with $.Site.Params.properName }}
    I go by <span class="p-name">{{ . -}}</span>.
  {{- end -}}
  {{ with $.Site.Params.honorificPrefix }}
    My preferred honorific prefix is <span class="p-honorific-prefix">{{ . -}}</span>.
  {{ end }}
  {{- if ($.Site.Params.pronounNominative | default ($.Site.Params.pronounOblique | default $.Site.Params.pronounPossessive)) }}
    I use
    {{ with $.Site.Params.pronounNominative -}}
      <span class="p-x-pronoun-nominative">{{ . -}}</span>,
    {{- end }}
    {{ with $.Site.Params.pronounOblique }}
      <span class="p-x-pronoun-oblique">{{ . -}}</span>,
    {{- end -}}
    {{ with $.Site.Params.pronounPossessive }}
      <span class="p-x-pronoun-possessive">{{ . -}}</span>,
    {{- end }}
    as my pronouns.
  {{- end -}}
  {{- with $.Site.Params.genderIdentity }}
    I am a <span class="p-gender-identity">{{ . }}</span>.
  {{- end -}}
  {{- with $.Site.Params.tribalHeritage }}
    I am of the <span class="p-tribal-heritage">{{ . }}</span>.
  {{- end -}}
  {{- if ($.Site.Params.locality | default ($.Site.Params.region | default ($.Site.Params.country | default $.Site.Params.traditionalSovereignty))) }}
    I reside in
    {{- with $.Site.Params.locality }}
      <span class="p-locality">{{ . -}}</span>,
    {{- end -}}
    {{- with $.Site.Params.region }}
      <span class="p-region">{{ . -}}</span>,
    {{- end -}}
    {{- with $.Site.Params.country }}
      <span class="p-country-name">{{ . -}}</span>
      {{- with $.Site.Params.traditionalSovereignty -}}
	,
      {{- end -}}
    {{- end -}}
    {{- with $.Site.Params.traditionalSovereignty }}
      land once lived on by the <span class="p-traditional-regional-sovereignty">{{ . -}}</span>, who never ceded sovereignty
    {{- end -}}
    .
  {{- end -}}
  {{- with $.Site.Params.canonicalURL }}
    My main online presence is at <a href="{{ . }}" rel="me" class="u-url u-uid">{{ . }}</a>.
  {{- end -}}
  {{- with $.Site.Params.email }}
    My email is <a href="mailto:{{ . }}" class="u-email">{{ . }}</a>.
  {{- end -}}
</p>
```


##### Head Links {#head-links}

**_NOTE:_** The domain is hardcoded into the webmentions here because I'm sleepy.

```html
<link href="https://gmpg.org/xfn/11" rel="profile">
{{ if (eq $.Site.Params.showHCard true) }}
  <link href="{{ $.Site.Params.canonicalURL | default $.Site.BaseURL }}" rel="me">
{{ end }}

{{- with .Params.Email }}
<link href="mailto:{{- . -}}" rel="me authn">
{{- end -}}
{{- if .Params.Webmentions }}
<link rel="webmention" href="https://webmention.io/emsenn.net/webmention" />
<link rel="pingback" href="https://webmention.io/webmention?forward=https://emsenn.net/webmention" />
{{ end }}
```


##### Head Meta {#head-meta}

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<meta name="referrer" content="no-referrer">
{{- with .Params.description }}
<meta name="description" content="{{ . }}">
{{- end -}}
{{- with .Params.keywords }}
<meta name="keywords" content="{{- .Render "keywords" -}}">
{{- end -}}
{{- with (.Params.author | default (.Site.Author)) }}
<meta name="author" content="{{ delimit .  ", " }}">
{{- end }}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:locale" content="{{ .Site.Language.Lang }}">
<meta property="og:site_name" content="{{ .Site.Title }}">
{{- with .Title }}
<meta property="og:title=" content="{{ . }}">
{{- end -}}
{{- with .Params.Description }}
<meta property="og:description" content="{{ . }}">
{{- end }}
```


##### Head Title {#head-title}

```html
<title>{{- (printf "%s" (.Title | default (printf "Tag: %s" (replace .Data.Term "-" " ") | pluralize))) -}} </title>

```


##### Header Title {#header-title}

```html
{{ if .IsHome }}
  <h1>{{ .Site.Title }}</h1>
{{ else }}
  {{ with .Title }}
    <h1>{{ . }}</h1>
  {{ end }}
{{ end }}
```


##### Page Description {#page-description}

```html
{{- if .Title -}}
  <strong><em>
    <a href="{{ .Permalink }}">
      {{- .Title -}}
    </a>
  </strong></em>
{{- else -}}
  This
{{- end -}}
{{- if .Type }}
  is a <a href="{{- printf "%s%s/" .Site.BaseURL .Type -}}">
	 {{ (replace (.Type | singularize) "-" " ") -}}
       </a>
{{- end -}}
{{- if .Description -}}
  : "{{- .Description -}}"
{{- else if .Params.Tags }}
  {{ with .Param "tags" }}
    {{ $scratch := newScratch }}
    {{ range . }}
      {{ $scratch.Add "tags" (slice (printf "<a href=\"%stags/%s/\">%s</a>" $.Site.BaseURL (. | urlize) (replace . "-" " "))) }}
    {{ end }}
    tagged with {{ delimit ( $scratch.Get "tags" ) ", " ", and " }}
  {{- end }}
{{- end -}}
{{- if .Description -}}
{{- else -}}
  .
{{- end -}}
{{ if (or .PublishDate .Date) }}
  It was
  {{ if (and (.PublishDate) (ne .PublishDate .Date)) }}
    first published on {{ dateFormat "Jan 2, 2006" .PublishDate }}
    {{ if .Date }}
      and updated on {{ dateFormat "Jan 2, 2006" .Date }}
    {{ end }}
    .
  {{ else if .Date }}
    released on {{ dateFormat "Jan 2, 2006" .Date }}.
  {{ end }}
{{ end }}
{{ if .Draft }}
  <strong>This {{ .Type | singularize }} has been flagged as a <em>draft</em>.</strong>
  It is not complete, and should be viewed that way.
{{ end }}
```


##### Index Menu Listing {#index-menu-listing}

```html
{{ with .Site.Menus.index }}
  <ul>
    {{ range . }}
      <li><a href="{{ .URL }}">{{ .Name }}</a></li>
    {{ end }}
  </ul>
{{ end }}
```


##### Maker Brief {#maker-brief}

```html
{{- with $.Site.Params.makeThings -}}
I {{ $.Site.Params.makeVerb | default "make" }}
{{ if (eq (len .) 1) }}
{{ with first 1 . }}
{{- . | markdownify -}}
{{ end }}
{{- else if (eq (len .) 2) }}
{{- delimit . " and " | markdownify -}}
{{- else }}
{{- delimit . ", " ", and " | markdownify -}}
{{- end -}}
{{- with $.Site.Params.makeFocus }}
with a focus on {{ .  | markdownify }}
{{- end -}}
.
{{- end -}}
```


##### Pages Listing {#pages-listing}

```html
{{ with .Pages }}
  <ul>
    {{ range sort . "Title" "asc" }}
      <li>
	{{ partial "page-description" . }}
      </li>
    {{ end }}
  </ul>
{{ end }}
```


##### Personal Summary Section {#personal-summary-section}

```html
<section class="personal-summary">
  <p>
    {{ partial "personal-whatido-span.html" . }}
    {{ partial "personal-recent-actions-span.html" . }}
  </p>
  <p>
    {{ partial "personal-current-plans-span.html" . }}
    {{ partial "personal-soon-plans-span.html" . }}
  </p>
  {{ if (eq $.Site.Params.showHCard true) }}
    {{ partial "h-card-paragraph.html" . }}
  {{ end }}

</section>
```


##### Personal "What I Do" Span {#personal-what-i-do-span}

```html
<span class="what-i-do">
{{- with $.Site.Params.makeThings -}}
  I {{ $.Site.Params.makeVerb | default "make" }}
  {{ if (eq (len .) 1) }}
    {{ with first 1 . }}
      {{- index . 1 | markdownify -}}
    {{ end }}
  {{- else if (eq (len .) 2) }}
    {{- delimit . " and " | markdownify -}}
  {{- else }}
    {{- delimit . ", " ", and " | markdownify -}}
  {{- end -}}
  {{- with $.Site.Params.makeFocus }}
    with a focus on {{ .  | markdownify }}
  {{- end -}}
  .
{{- end -}}
</span>
```


##### Personal Recent Actions Span {#personal-recent-actions-span}

```html
{{ with $.Site.Data.personalData.activities }}
  <span class="recent-actions">
    Recently, I
    {{ $scratch := newScratch -}}
    {{- $scratch.Set "activityData" . -}}
    {{- $scratch.Set "recentActivities" slice -}}
    {{- range $date,$activities := . -}}
      {{- $scratch.Add "dates" (slice .) -}}
    {{- end -}}
    {{- range sort ($scratch.Get "dates") "value" "desc" -}}
      {{- $scratch.Add "activities" (slice .) -}}
    {{- end -}}
    {{- range last 3 ($scratch.Get "activities") -}}
      {{- $scratch.Add "recentActivities" . -}}
    {{- end -}}
    {{- with ($scratch.Get "recentActivities") -}}
      {{- if (eq (len .) 0) -}}
      {{- else -}}
	{{- if (eq (len .) 1) -}}
	  {{- ( . | markdownify) -}}
	{{- else if (eq (len .) 2) -}}
	  {{- (delimit . " and ") | markdownify -}}
	{{- else -}}
	  {{- (delimit . ", " ", and ") | markdownify -}}
	{{- end -}}
      {{- end -}}
    {{- end -}}
  .
{{ end }}
```


##### Personal Current Plans Span {#personal-current-plans-span}

```html
<span class="current-plans">
  Currently, I am {{ partial "plans-delimiter.html" $.Site.Data.personalData.plans.current }}.
</span>
```


##### Personal Soon Plans Span {#personal-soon-plans-span}

```html
<span class="current-plans">
  Soon, I plan to {{ partial "plans-delimiter.html" $.Site.Data.personalData.plans.soon }}.
</span>
```


##### Plans Delimiter {#plans-delimiter}

```html
{{- $scratch := newScratch -}}
{{- range . -}}
  {{- $scratch.Add "plans" (slice ( . | markdownify )) -}}
{{- end -}}
{{- with ($scratch.Get "plans") -}}
{{- if (eq (len .) 0) -}}{{- else -}}
  {{- if (eq (len .) 1) }}
      {{ . }}
    {{- else if (eq (len .) 2) }}
      {{ delimit . " and " }}
    {{- else }}
      {{ delimit (first 3 .) ", " ", and " }}
    {{- end -}}
  {{- end -}}
{{- end -}}
```


##### Plans Listing {#plans-listing}

```html
{{- $scratch := newScratch -}}
{{- range . -}}
  {{- $scratch.Add "plans" (slice ( . | markdownify )) -}}
{{- end -}}
{{- with ($scratch.Get "plans") -}}
{{- if (eq (len .) 0) -}}{{- else -}}
<ul>
{{- range first 3 . -}}
<li>{{ . }}</li>
{{- end -}}
</ul>
{{- end -}}{{- end -}}
```


##### Recent Activities Brief {#recent-activities-brief}

```html
{{- $scratch := newScratch -}}
{{- $scratch.Set "activityData" . -}}
{{- $scratch.Set "recentActivities" slice -}}
{{- range $date,$activities := . -}}
{{- $scratch.Add "dates" (slice .) -}}
{{- end -}}
{{- range sort ($scratch.Get "dates") "value" "desc" -}}
{{- $scratch.Add "activities" (slice .) -}}
{{- end -}}
{{- range last 3 ($scratch.Get "activities") -}}
{{- $scratch.Add "recentActivities" . -}}
{{- end -}}
{{- with ($scratch.Get "recentActivities") -}}
{{- if (eq (len .) 0) -}}
{{- else -}}
  {{- if (eq (len .) 1) -}}
      {{- . -}}
    {{- else if (eq (len .) 2) -}}
      {{- delimit . " and " -}}
{{- else -}}
{{- delimit . ", " ", and " -}}
    {{- end -}}
{{- end -}}
{{- end -}}
```


##### Recent Activities Listing {#recent-activities-listing}

```html
{{ $scratch := newScratch }}
    {{ with .Site.Data.personalData.activities }}
      <h2>My Recent Activites</h2>
      <ul>
	{{ range $date, $report := . }}
	  {{ $scratch.Add "activityDates" (slice $date) }}
	{{ end }}
	{{ range ($scratch.Get "activityDates") }}
	    <li>
	      {{ (printf "**%s**" (dateFormat "January 2, 2006" .)) | markdownify -}}
	      {{- with (index $.Site.Data.personalData.activities .) -}}
		{{- if (eq (len .) 1) -}}
		  {{- (printf ": %s" (markdownify (index . 0)) | safeHTML) -}}
		{{- else -}}
		  <ul>
		    {{ range . }}
		      <li>{{ . | safeHTML | markdownify }}</li>
		    {{ end }}
		  </ul>
		{{ end }}
	      {{ end }}
	    </li>
	{{ end }}
      </ul>
    {{ end }}
```


##### Recentest Page Brief {#recentest-page-brief}

```html
The page most recently added to this website is
{{ range first 1 .Pages.ByPublishDate.Reverse }}
<a href="{{.Permalink}}">{{.Title}}</a>, a(n)
{{ .Type}}: "{{ .Description }}"
{{ end }}
```


##### Recentest Page Span {#recentest-page-span}

```html
<span class="recentest-page">
  The page most recently added to this website is
  {{- range first 1 $.Site.Pages.ByPublishDate.Reverse }}
    <a href="{{- .Permalink -}}">{{- .Title -}}</a>, a(n)
    {{ .Type | singularize -}}
    {{- with .Description -}}
      : "{{- . -}}"
    {{- else -}}
      .
    {{- end -}}
  {{- end -}}
</span>
```


##### Section Count {#section-count}

```html
{{- $sectionCount := (len (where .Site.RegularPages "Type" .Section)) -}}
{{- $sectionCount }} <a href="{{ .Section }}/">{{- if (eq $sectionCount 1) -}}{{- .Section | humanize | lower | singularize -}}{{- else -}}{{- .Section | humanize | lower -}}{{- end -}}</a>{{- printf "" -}}
```

Why does this end in an empty printf statement? Otherwise the template returns ending in a newline and that'd need to be stripped away every time!


##### Site Contents Brief {#site-contents-brief}

```html

```


##### Site Contents Listing {#site-contents-listing}

```html
{{- $scratch := newScratch -}}
{{- range where $.Site.RegularPages ".File.TranslationBaseName" "in" $.Site.Params.mainPages -}}
  {{- $scratch.Add "mainPagePhrases" (slice ((printf "<a href=\"%s\">%s</a>" .Permalink .Params.indexPhrase) | safeHTML)) -}}
{{- end -}}
{{- $mPP := ($scratch.Get "mainPagePhrases") -}}
{{- range $.Site.Params.mainSections -}}
  {{ if (eq (len (where $.Site.RegularPages "Type" .)) 0) }}{{ else }}
  {{- $scratch.Add "mainSectionCounts" (slice (partial "section-count.html" (dict "Section" . "Site" $.Site))) -}}
  {{ end }}
{{- end -}}
{{- $mS := ($scratch.Get "mainSectionCounts") -}}



{{- if (eq (len $mPP) 0) -}}
{{- else -}}
<ul>
{{- range $mPP -}}<li><a href="{{ . }}">{{ . }}</a></li>{{ end }}
</ul>
{{ end }}

{{- if (eq (len $mS) 0) }}
{{- else }}
<ul>
{{- range $mS -}}<li><a href="{{ . }}">{{ . }}</a></li>{{ end }}
</ul>
{{ end }}
```


##### Site Overview Section {#site-overview-section}

```html
<p>
  {{ partial "site-main-pages-span.html" .}}
  {{ partial "recentest-page-span.html" . }}
  In total, this website has around {{ (partial "total-fuzzy-word-count.html" .) | humanize }} words.
</p>
{{ partial "site-main-sections-listing.html" . }}
{{ partial "site-tags-listing.html" . }}
```


##### Site Main Pages Span {#site-main-pages-span}

```html
{{- $scratch := newScratch -}}
{{- range where $.Site.RegularPages ".File.TranslationBaseName" "in" $.Site.Params.mainPages -}}
  {{- $scratch.Add "mainPagePhrases" (slice (printf "<a href=\"%s\">%s</a>" .Permalink .Params.mainPhrase)) -}}
{{- end -}}
{{- $mPP := ($scratch.Get "mainPagePhrases") -}}

{{- if (eq (len $mPP) 0) -}}
{{- else -}}
This website has pages to
{{- if (eq (len $mPP) 1) }}
{{ (index $mPP 0) }}
{{- else if (eq (len $mPP) 2) }}
{{ delimit $mPP " and " }}
{{- else }}
{{ delimit $mPP ", " ", and " }}
{{- end -}}
.
{{- end -}}

```


##### Site Tags Brief {#site-tags-brief}

```html
Pages on this website are sometimes given tags to indicate their topic(s). There are
{{ $scratch := newScratch }}
{{ range .Site.Taxonomies.tags }}
{{ $scratch.Add "tags" (slice (printf "%s page(s) tagged \"<a href=\"%s\">%s</a>\"" (string .Count) .Page.Permalink (.Page.Title | humanize) )) }}
{{ end }}
<ul><li>
{{ delimit ($scratch.Get "tags") ",</li><li>" ", and</li><li>" }}
</li></ul>
```


##### Site Tags Span {#site-tags-span}

```html
<span class="site-tags">
</span>
```


##### Site Main Sections Listing {#site-main-sections-listing}

```html
  {{ $scratch := newScratch }}
  {{- range $.Site.Params.mainSections -}}
    {{ if (eq (len (where $.Site.RegularPages "Type" .)) 0) }}{{ else }}
    {{- $scratch.Add "mainSectionCounts" (slice (partial "section-count.html" (dict "Section" . "Site" $.Site))) -}}
    {{ end }}
  {{- end -}}
  {{- $mS := ($scratch.Get "mainSectionCounts") -}}
  {{- if (eq (len $mS) 0) }}
  {{- else }}
  This website contains pages of the follow types:
  <ul><li>
  {{- if (eq (len $mS) 1) }}
  {{ (index $mS 0) }}</li>
  {{- else if (eq (len $mS) 2) }}
  {{ delimit $mS ",</li><li> " }}
  {{- else }}
  {{ delimit $mS ",</li><li> " ", and</li><li> " }}.</li>
  {{- end -}}
  </ul>
  {{- end -}}

</span>
```


##### Site Tags Listing {#site-tags-listing}

```html
Pages on this website are sometimes given tags to indicate their topic(s).

{{ $scratch := newScratch }}
{{ range .Site.Taxonomies.tags }}
{{ $scratch.Add "tags" (slice (printf "\"<a href=\"%s\">%s</a>\" has been applied to %s page(s)" .Page.Permalink (replace .Page.Title "-" " ") (string .Count)  )) }}
{{ end }}
<ul><li>
{{ delimit ($scratch.Get "tags") ",</li><li>" ", and</li><li>" }}.
</li></ul>
```


##### Total Word Count {#total-word-count}

```html
{{ $scratch := newScratch }}
{{ range $.Site.RegularPages }}{{ $scratch.Add "totalWordCount" .WordCount }}{{ end }}
{{ $scratch.Get "totalWordCount" }}
```


##### Total Fuzzy Word Count {#total-fuzzy-word-count}

```html
{{ $scratch := newScratch }}
{{ range $.Site.Pages }}{{ $scratch.Add "totalWordCount" .FuzzyWordCount }}{{ end }}
{{ $scratch.Get "totalWordCount" }}
```


##### Webmention Feed {#webmention-feed}

```html
{{ $mentions := getJSON (add "https://webmention.io/api/mentions.jf2?target=" .Permalink) }}
{{ $mentions.name | default "Webmentionssss" }}
{{ with $mentions.children }}
<ul>{{ range . }}
<li>{{ . }}</li>
{{ end }}{{ end }}
```


##### Who Am I {#who-am-i}

```html
{{- with $.Site.Params.givenName -}}
{{- (printf "<span class=\"given-name\">%s</span>" .) | safeHTML -}}
{{- end -}}
{{- with $.Site.Params.familyName -}}
{{- (printf "<span class=\"family-name\">%s</span>" .) | safeHTML -}}
{{- end -}}
```


## Supplements {#supplements}

<div class="ox-hugo-toc toc local">
<div></div>

- [Index](#index)
- [README](#readme)
- [Source](#source)

</div>
<!--endtoc-->


### Index {#index}

JSON
:


HTML
:


Markdown
:


Hugo
:


### README {#readme}

This Hugo theme was created by emsenn, was last released on 2019-10-15, and is currently on version 0.1.0.

It is an implementation of a Hugo Theme for creating a _personal website_: a website catered around presenting information about a person. Hugo is a static site generator written in Go.

The theme is written primarily for my personal use, on [https://emsenn.net](https://emsenn.net).

My website contains information about me, a collection of my writing, and my various projects. My goal is to provide all that information with enough other information that folk can get a more holistic understanding of it.

This theme is in early development and poorly documented, but I have big aspirations for it.


### Source {#source}

The following is the source of this document as it was written by the
author.

```org
#+TITLE: Hugo Personal Website Theme
#+AUTHOR: emsenn
#+DATE: 2019-10-15
#+EXPORT_FILE_NAME: ./hugo-personal-website-theme
#+HUGO_BASE_DIR: ~/dev/personal-website/
#+HUGO_SECTION: computer-instruction-sets
#+HUGO_TAGS: CSS HTML Hugo
#+MACRO: doc {{{document-type}}}
#+MACRO: document-type Hugo theme
#+MACRO: version 0.1.0
#+TOC: headlines 2
* Introduction
  :PROPERTIES:
  :CUSTOM_ID: introduction
  :END:
This {{{doc}}} was created by {{{author}}}, was last released on {{{date}}}, and is currently on version {{{version}}}.

It is an implementation of a Hugo Theme for creating a /personal website/: a website catered around presenting information about a person. Hugo is a static site generator written in Go.

The theme is written primarily for my personal use, on [[https://emsenn.net][https://emsenn.net]].

My website contains information about me, a collection of my writing, and my various projects. My goal is to provide all that information with enough other information that folk can get a more holistic understanding of it.

This theme is in early development and poorly documented, but I have big aspirations for it.
* Hugo Personal Website Theme
  :PROPERTIES:
  :CUSTOM_ID: hugo-media-package-channel-generator
  :header-args: :padline no
  :END:
#+TOC: headlines 1 local
** DRAFT Overview
This theme provides templates[fn:1] for generating a static website with the Hugo static site generator. It's currently in-development, so the documentation, where present, is bad, and the code is even worse.

This is an ambitious theme: it currently is fed data from exported version of most of my source code and writing, in addition to some native content and data, and I have plans to pull in some remote data as well.
** DRAFT Operations
#+TOC: headlines 1 local
*** Install the Theme
**** Install with Git
*/Coming soon!/*
**** Install from Source
This theme's source exists as an /Org-mode/ document. The best way to work with it, then, is by editing that document, in /Emacs/. Then, you can use Babel to "tangle" the Hugo templates and such into their proper files. Edit the /Org-mode/ file and then re-"tangle" the document to create fresh source files.
** DRAFT Theme Configuration
The configuration below /tangles/ to =./build/theme.toml=. Explaining
it in detail is beyond the scope of this document, but if you're changing this theme, you'll probably wanna change this to reflect that. (Especially if you plan on sharing the theme; I don't want to be receiving credit for your code!)
#+begin_src toml :tangle ./theme.toml
  name = "Hugo Personal Website Theme"
  license = "CC0"
  [author]
    name = "emsenn"
    homepage = "https://emsenn.net"
#+end_src
** Expected Site Configuration
*** Built-in Variables
The following variables come at the start of the configuration file, and are built-in to Hugo.
**** =baseURL=
Available in templates through =.Site.BaseURL=.
**** =languageCode=
Available in templates through =.Site.LanguageCode=.
**** =enableEmoji=
**** =title=
**** =author=
**** =email=
**** =theme=
*** Theme Parameters
**** =mainPages=
Available through =.Site.Params.mainPages=, this list of strings indicates which pages are considered "main" on my website.

Used by the [[#site-main-pages-span]["Site Main Pages Span"]] HTML partial template.
**** =mainSections=
**** =makeVerb=
**** =makeThings=
**** =makeFocus=
**** =showHCard=
**** =properName=
**** =honorificPrefix=
**** =canonicalURL=
**** =nickname=
**** =logo=
**** =logoAlt=
**** =givenName=
**** =familyName=
**** =locality=
**** =region=
**** =country=
**** =phoneNumber=
**** =photoURL=
** Page Templates
This section contains the different page /layouts/.
#+TOC: headlines 1 local
*** HTML Page Templates
#+toc: headlines 1 local
**** 404 Page Layout
This template is used to render the 404 error page.

#+NAME: 404-layout
#+BEGIN_SRC html :tangle ./layouts/404.html
  {{- define "header" -}}
    <h1>404: Page Not Found</h1>
  {{- end -}}
  {{- define "main" -}}
    <article>
      <p>There is no page at this address: this is a <code>404</code> error. You may wish to go to my <a href="{{ .Site.BaseURL }}">homepage</a>. You may also wish to use your browser's Back button to return to the previous page.
      </p>
    </article>
  {{- end -}}
#+END_SRC
**** Basic Page Layout
     :PROPERTIES:
     :CUSTOM_ID: basic-html-template
     :END:
Located at =./layouts/_default/baseof.html=, this template serves as the base for the other HTML page templates.

This template, like a lot of them, relies heavily on partials and conditionals about what configuration or content your site has.

#+BEGIN_SRC html :tangle ./layouts/_default/baseof.html
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
{{- with .Site.Language.Lang }} xml:lang="{{- . -}}" lang="{{- . -}}"
{{- end }}>
<head>
{{ partial "head-meta.html" . }}
{{ partial "head-links.html" . }}
{{ partial "head-title.html" . }}
      <style>
      {{ partial "basic-css.css" . | safeCSS }}
      </style>
    </head>
    <body>
      <a class="skipToContentLink" href="#content">Skip to Content</a>
      <article class="h-entry">
	<header>
	  {{- block "header" . -}}
	    {{ partial "header-title" . }}
	    {{ if (eq .Kind "page") }}
	      {{ partial "page-description" . }}
	    {{ else if (eq .Kind "section") }}
	      {{ with .Content }}
		{{ . }}
	      {{ end }}
	    {{ end }}
	   {{- end -}}
	</header>
	<main>
	  {{- block "main" . -}}
	    <!-- -->
	  {{- end }}
	</main>
	<footer>
	  {{- block "footer" . -}}
	    {{ if (eq .Kind "page") }}
	      {{ partial "license-span.html" . }}
	      {{ partial "download-prompt-span.html" . }}
	    {{ end }}
	    {{ partial "solicitation-span.html" . }}
	  {{- end }}
	</footer>
      </article>
    </body>
  </html>
#+end_src
**** Index Page Layout
Located at =./layouts/_default/index.html=, this template controls how the website's homepage looks.

If there is no content in the site's =content/_index.md= file, then the HTML partials [[#personal-summary-section][Personal Summary Section]] and [[#site-overview-section][Site Overview Section]] are used.
#+NAME: index-layout
#+BEGIN_SRC html :tangle ./layouts/_default/index.html
  {{ define "header" }}
    <h1>My name is emsenn</h1>
    This is my website
  {{ end }}
  {{ define "main" }}
    {{ with .Content }}
      <section>
	{{ . }}
      </section>
    {{ else }}
      {{ partial "personal-summary-section.html" . }}
      {{ partial "site-overview-section.html" . }}
   {{ end }}
  {{ end }}
#+END_SRC
**** List Page Layout
Located at =./build/layouts/_default/list.html=, this /layout/ serves
serves as the base for pages that exist to serve lists, like the index
(homepage), or taxonomical list pages, such as those for categories or
tags.
#+BEGIN_SRC html :tangle ./layouts/_default/list.html
  {{ define "main" }}
    {{ partial "pages-listing" . }}
  {{ end }}
#+END_SRC
**** Single Page Layout
This is the layout used for any "single" page, which is most any page that isn't providing a listing, like taxonomical pages.

It, like all HTML templates, uses the [[#basic-html-template][Basic HTML Template]] as its base.
#+NAME: default-single-document-layout
#+BEGIN_SRC html :tangle ./layouts/_default/single.html
  {{- define "main" -}}
    {{ with .Content }}
      {{ . }}
    {{ end }}
  {{ end }}
#+END_SRC
**** Webring Layouts
***** DRAFT Writers of the Fediverse Webring
#+BEGIN_SRC html :tangle ./layouts/_default/writers-of-the-fediverse-webring.html
  {{- define "main" -}}
    {{ with .Content }}
      {{ . }}
    {{ end }}
    {{ $ring := getJSON "http://ring.acdw.net/members" }}
    {{ with $ring }}<ul>{{ range $ring }}
      <li><a href="{{ .href }}">{{ .name }}</a>: {{ .desc }}
	{{ with .fedi }}
	  Follow them at <a href="{{ . }}">{{ . }}</a>.
	{{ end }}</li>{{ end }}</ul>{{ end }}
  {{- end -}}
#+END_SRC
**** TODO Log Page Layout
#+BEGIN_SRC html :tangle ./layouts/_default/log.html
  {{- define "main" -}}
    {{ with .Params.Tags }}
      {{ range . }}
	{{ . }}
      {{ end }}
    {{ end }}
    {{ with .Content }}
      {{ . }}
    {{ end }}
  {{- end -}}
#+END_SRC
**** Unique Pages
***** Log Listing
#+begin_src html :tangle ./layouts/_default/log-listing.html
{{ define "main" }}
{{ with .Content }}{{ . }}{{ end }}
  {{ with .Pages }}
    <ul>
      {{ range .ByDate.Reverse }}
	<li>
	  <a href="{{ .Permalink}}"><strong>
	     {{- .Title -}}</strong></a>
	</li>
      {{ end }}
    </ul>
  {{ end }}
{{ end }}
#+end_src
***** Now Page
#+begin_src html :tangle ./layouts/_default/now.html
{{ define "main" }}
<p>My name is {{ partial "who-am-i.html" . }}. {{ partial "personal-whatido-span.html" . }}</p>
<p>
Here's some of what I'm working on now:
</p>
{{ partial "plans-listing.html" $.Site.Data.personalData.plans.current }}
<p>
Here's what I plan to do soon:
{{ partial "plans-listing.html" $.Site.Data.personalData.plans.current }}
</p>
{{ end }}
#+end_src
** Partial Templates
#+toc: headlines 1 local
*** HTML Partial Templates
#+toc: headlines 1 local
**** Solicitation Span
This partial template provides a =<span>= tag containing a solicitation for donations.

#+begin_src html :tangle ./layouts/partials/solicitation-span.html
  <span class="solicitation">
    This {{ (replace .Type "-" " ") | singularize }} was created with <a href="{{ (printf "%s/support/" $.Site.BaseURL) }}">support</a> from humans like you. Thank you!
  </span>
#+end_src
**** License Span
This partial template provides a =<span>= tag.

#+begin_src html :tangle ./layouts/partials/license-span.html
  <span class="license">
    This {{ (replace .Type "-" " ") | singularize }} was made by <a href="https://emsenn.net/">emsenn</a> for the benefit of the commons. To the extent possible under law, I have waived all copyright and related or neighboring rights to it.
  </span>
#+end_src
**** Download Prompt Span
This partial template provides a =<span>= tag.

#+begin_src html :tangle ./layouts/partials/download-prompt-span.html
  <span class="download-prompt">
    If you're viewing this {{ (replace .Type "-" " ") | singularize }} on a remote server, you're encouraged to download your own copy.
  </span>
#+end_src
**** Basic CSS
#+begin_src css :tangle ./layouts/partials/basic-css.css
body {
position: relative;
background-color: #eee;
color: #444;
font-family: serif;
margin: 0 auto;
padding-bottom: 6rem;
min-height: 100%;
font-size: 1.2em;
}
header {
font-family: sans-serif;
text-align: left;
margin-left: 1em;
width: 80vw;
overflow: hidden;
margin-bottom: 2em;
padding-bottom: 0.5em;
border-bottom: 0.1em dotted #444;
}
h1, .title { margin: 0.2em 0 0.2em 0; font-size: 3.2rem; }
h2, .subtitle { font-size: 2.2rem; }
main, #content {
width: 85vw;
max-width: 40em;
margin: 0 0 0 1em;
line-height: 1.6;
margin-bottom: 3rem;
border-bottom: 0.1em dotted #444;
}
footer, #postamble {
width: 90vw;
max-width 45em;
margin: 0 0 0 2em;
font-family: sans-serif;
}
section {
border-bottom: 0.1em solid #444;
margin-bottom: 1em;
}
.outline-3 {
border-bottom: 0.1rem dotted #444;
}
blockquote {
padding: 0.5rem;
border-left: 0.1em solid #444;
}
table {
border-collapse: collapse;
border-spacing: 0;
empty-cells: show;
border: 0.1em solid #444;
}
thead { font-family: sans-serif; }
th, td {
padding: 0 0.3em;
border: 0.01em solid #444;
}
img {
max-width: 80vw;
vertical-align: middle;
}
pre, .src {
padding: 0.5em;
border: 0.1em solid #444;
white-space: pre-wrap;
overflow-x: scroll;
text-overflow: clip;
}
dt {
font-weight: normal;
display: inline-block;
border-bottom: 0.1rem dotted #444;
}
#text-index dt { border-bottom: none; }
h2, h3, h4, h5, h6, h7, h8, h9, h10 {
display: block;
font-family: sans-serif;
margin: 0.5em;
}
h2 {
text-align: center;
}
h2 { font-size: 2em; }
h3 {
font-size: 1.8em;
}
h4 {
font-size: 1.6em;
}
h5 {
font-size: 1.4em;
margin: 0.5em 0 0.2em 10%;
}
h6 {
font-size: 1.2em;
margin: 0.5em 0 0.2em 30%;
}
a {
text-decoration: none;
color: #3ac;
display: inline;
position: relative;
border-bottom: 0.1rem dotted;
line-height: 1.2;
transition: border 0.3s;
}
a:hover {
color: #5ce;
outline-style: none;
border-bottom: 0.1rem solid;
}
a:visited { color: #b8c; }
a:visited:hover { color: #dae; }
a:focus {
outline-style: none;
border-bottom: 0.1rem solid;
}
::selection { background-color: #777; color: #eee; }
a::selection { background-color: #ccc; }
.todo {
background-color: #ddd;
color: #333;
font-size: .8rem;
float: right;
}
.org-src-container + .example {
margin-left: 8em;
}
label.org-src-name {
margin: 0 0 0 3em;
font-family: sans-serif;
font-size: 1rem;
line-height: 0;
}
.skipToContentLink {
opacity: 0;
position: absolute;
}
.skipToContentLink:focus{
opacity:1
}
#+end_src
**** Essay Brief
#+begin_src html :tangle ./layouts/partials/essay-brief.html
<a href="{{- .Permalink -}}">{{- .Title -}}</a> is a {{ .FuzzyWordCount -}}-word essay
{{- with .Date }} released on {{ (dateFormat "January 2, 2006" .) -}}{{- end -}}
{{- with .Params.tags }} about {{ range . -}}{{- . | humanize | lower -}}{{- end -}}{{- end -}}.
#+end_src
**** DRAFT H-card
This /partial template/ is for generating an /h-card/, a sort of online "business card." To verify that your /h-card/ is functioning, IndieWeb have provided a validator: [[https://indiewebify.me/validate-h-card/][https://indiewebify.me/validate-h-card/]]

This /template/
#+begin_src html :tangle ./layouts/partials/h-card.html
<section class="vcard h-card">
<details><summary>Naming</summary>
  Proper Name: <span class="p-name">{{ $.Site.Params.properName }}</span>
  {{ if (or $.Site.Params.givenName $.Site.Params.familyName) }}
  <table>
    <thead><tr>
      {{ with $.Site.Params.honorificPrefix }}<th>Honorific</th>{{ end }}
      {{ with $.Site.Params.givenName }}<th>Given Name</th>{{ end }}
      {{ with $.Site.Params.familyName }}<th>Family Name</th>{{ end }}
    </tr></thead>
    <tbody><tr>
      {{ with $.Site.Params.honorificPrefix }}<td>{{ . }}</td>{{ end }}
      {{ with $.Site.Params.givenName }}<td>{{ . }}</td>{{ end }}
      {{ with $.Site.Params.familyName }}<td>{{ . }}</td>{{ end }}
    </tr></tbody>
  </table>
  {{ end }}
</details>
<details><summary>Images</summary>
  {{ with $.Site.Params.logo }}
    <dt>Logo</dt>
    <dd><img style="max-width: 3em;" class="u-logo" src="{{ . }}"
	  {{ with $.Site.Params.logoAlt }}
	    alt="{{ . }}"
	  {{ end }}></dd>
  {{ end }}
  {{ with $.Site.Params.photo }}
    <dt>Photo</dt>
    <dd><img style="max-width: 4em;" class="u-photo" src="{{ . }}"
	  {{ with $.Site.Params.photoAlt }}
	    alt="{{ . }}"
	  {{ end }}></dd>
  {{ end }}
</details>
{{ if (or $.Site.Params.canonicalURL $.Site.Params.phoneNumber) }}
<details><summary>Contact Methods</summary>
<dl>
{{ with $.Site.Params.canonicalURL }}
<dt>Homepage</dt><dd><a class="u-url u-uid" rel="me" href="{{ .}}">{{ . }}</a></dd>
{{ end }}
{{ with $.Site.Params.email }}
<dt>Email</dt><dd><a class="u-email" href="mailto:{{ .}}">{{ . }}</a></dd>
{{ end }}
</dl>
</details>
{{ end }}
<details class="adr">
<summary>Physical Location</summary>
	<span class="locality">Chapel Hill</span>,
	<span class="region">North Carolina</span>,
	<span class="country-name">United States of America</span>
      </details>
      </p>
  </section>
#+end_src
**** H-Card Paragraph
This /partial template/ is for generating an /h-card/, a sort of online "business card." To verify that your /h-card/ is functioning, IndieWeb have provided a validator: [[https://indiewebify.me/validate-h-card/][https://indiewebify.me/validate-h-card/]]

This /template/...
#+begin_src html :tangle ./layouts/partials/h-card-paragraph.html
  <p class="vcard h-card">
    {{- with $.Site.Params.givenName -}}
      My given name is
      {{ if (eq $.Site.Params.familyNameFirst true) -}}
	{{- with $.Site.Params.familyName -}}
	  <span class="p-family-name">{{ . }}</span>
	{{- end -}}
	{{- with $.Site.Params.givenName -}}
	  <span class="p-given-name">{{ . }}</span>
	{{- end -}}
      {{ else -}}
	{{- with $.Site.Params.givenName -}}
	  <span class="p-given-name">{{ . }}</span>
	{{ end }}
	{{ with $.Site.Params.familyName }}
	  <span class="p-family-name">{{ . }}</span>
	{{- end -}}
      {{- end -}}
      {{- with $.Site.Params.properName -}}
	, but
      {{- end -}}
    {{- end -}}
    {{ with $.Site.Params.properName }}
      I go by <span class="p-name">{{ . -}}</span>.
    {{- end -}}
    {{ with $.Site.Params.honorificPrefix }}
      My preferred honorific prefix is <span class="p-honorific-prefix">{{ . -}}</span>.
    {{ end }}
    {{- if ($.Site.Params.pronounNominative | default ($.Site.Params.pronounOblique | default $.Site.Params.pronounPossessive)) }}
      I use
      {{ with $.Site.Params.pronounNominative -}}
	<span class="p-x-pronoun-nominative">{{ . -}}</span>,
      {{- end }}
      {{ with $.Site.Params.pronounOblique }}
	<span class="p-x-pronoun-oblique">{{ . -}}</span>,
      {{- end -}}
      {{ with $.Site.Params.pronounPossessive }}
	<span class="p-x-pronoun-possessive">{{ . -}}</span>,
      {{- end }}
      as my pronouns.
    {{- end -}}
    {{- with $.Site.Params.genderIdentity }}
      I am a <span class="p-gender-identity">{{ . }}</span>.
    {{- end -}}
    {{- with $.Site.Params.tribalHeritage }}
      I am of the <span class="p-tribal-heritage">{{ . }}</span>.
    {{- end -}}
    {{- if ($.Site.Params.locality | default ($.Site.Params.region | default ($.Site.Params.country | default $.Site.Params.traditionalSovereignty))) }}
      I reside in
      {{- with $.Site.Params.locality }}
	<span class="p-locality">{{ . -}}</span>,
      {{- end -}}
      {{- with $.Site.Params.region }}
	<span class="p-region">{{ . -}}</span>,
      {{- end -}}
      {{- with $.Site.Params.country }}
	<span class="p-country-name">{{ . -}}</span>
	{{- with $.Site.Params.traditionalSovereignty -}}
	  ,
	{{- end -}}
      {{- end -}}
      {{- with $.Site.Params.traditionalSovereignty }}
	land once lived on by the <span class="p-traditional-regional-sovereignty">{{ . -}}</span>, who never ceded sovereignty
      {{- end -}}
      .
    {{- end -}}
    {{- with $.Site.Params.canonicalURL }}
      My main online presence is at <a href="{{ . }}" rel="me" class="u-url u-uid">{{ . }}</a>.
    {{- end -}}
    {{- with $.Site.Params.email }}
      My email is <a href="mailto:{{ . }}" class="u-email">{{ . }}</a>.
    {{- end -}}
  </p>
#+end_src
**** DRAFT Head Links
*/NOTE:/* The domain is hardcoded into the webmentions here because I'm sleepy.
#+begin_src html :tangle ./layouts/partials/head-links.html
<link href="https://gmpg.org/xfn/11" rel="profile">
{{ if (eq $.Site.Params.showHCard true) }}
  <link href="{{ $.Site.Params.canonicalURL | default $.Site.BaseURL }}" rel="me">
{{ end }}

{{- with .Params.Email }}
<link href="mailto:{{- . -}}" rel="me authn">
{{- end -}}
{{- if .Params.Webmentions }}
<link rel="webmention" href="https://webmention.io/emsenn.net/webmention" />
<link rel="pingback" href="https://webmention.io/webmention?forward=https://emsenn.net/webmention" />
{{ end }}
#+end_src
**** Head Meta
#+begin_src html :tangle ./layouts/partials/head-meta.html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<meta name="referrer" content="no-referrer">
{{- with .Params.description }}
<meta name="description" content="{{ . }}">
{{- end -}}
{{- with .Params.keywords }}
<meta name="keywords" content="{{- .Render "keywords" -}}">
{{- end -}}
{{- with (.Params.author | default (.Site.Author)) }}
<meta name="author" content="{{ delimit .  ", " }}">
{{- end }}
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:locale" content="{{ .Site.Language.Lang }}">
<meta property="og:site_name" content="{{ .Site.Title }}">
{{- with .Title }}
<meta property="og:title=" content="{{ . }}">
{{- end -}}
{{- with .Params.Description }}
<meta property="og:description" content="{{ . }}">
{{- end }}
#+end_src
**** Head Title
#+begin_src html :tangle ./layouts/partials/head-title.html
<title>{{- (printf "%s" (.Title | default (printf "Tag: %s" (replace .Data.Term "-" " ") | pluralize))) -}} </title>

#+end_src
**** Header Title
#+begin_src html :tangle ./layouts/partials/header-title.html
  {{ if .IsHome }}
    <h1>{{ .Site.Title }}</h1>
  {{ else }}
    {{ with .Title }}
      <h1>{{ . }}</h1>
    {{ end }}
  {{ end }}
#+end_src
**** Page Description
#+begin_src html :tangle ./layouts/partials/page-description.html
  {{- if .Title -}}
    <strong><em>
      <a href="{{ .Permalink }}">
	{{- .Title -}}
      </a>
    </strong></em>
  {{- else -}}
    This
  {{- end -}}
  {{- if .Type }}
    is a <a href="{{- printf "%s%s/" .Site.BaseURL .Type -}}">
	   {{ (replace (.Type | singularize) "-" " ") -}}
	 </a>
  {{- end -}}
  {{- if .Description -}}
    : "{{- .Description -}}"
  {{- else if .Params.Tags }}
    {{ with .Param "tags" }}
      {{ $scratch := newScratch }}
      {{ range . }}
	{{ $scratch.Add "tags" (slice (printf "<a href=\"%stags/%s/\">%s</a>" $.Site.BaseURL (. | urlize) (replace . "-" " "))) }}
      {{ end }}
      tagged with {{ delimit ( $scratch.Get "tags" ) ", " ", and " }}
    {{- end }}
  {{- end -}}
  {{- if .Description -}}
  {{- else -}}
    .
  {{- end -}}
  {{ if (or .PublishDate .Date) }}
    It was
    {{ if (and (.PublishDate) (ne .PublishDate .Date)) }}
      first published on {{ dateFormat "Jan 2, 2006" .PublishDate }}
      {{ if .Date }}
	and updated on {{ dateFormat "Jan 2, 2006" .Date }}
      {{ end }}
      .
    {{ else if .Date }}
      released on {{ dateFormat "Jan 2, 2006" .Date }}.
    {{ end }}
  {{ end }}
  {{ if .Draft }}
    <strong>This {{ .Type | singularize }} has been flagged as a <em>draft</em>.</strong>
    It is not complete, and should be viewed that way.
  {{ end }}
#+end_src
**** Index Menu Listing
#+begin_src html :tangle ./layouts/partials/index-menu-listing.html
  {{ with .Site.Menus.index }}
    <ul>
      {{ range . }}
	<li><a href="{{ .URL }}">{{ .Name }}</a></li>
      {{ end }}
    </ul>
  {{ end }}
#+end_src
**** Maker Brief
#+begin_src html :tangle ./layouts/partials/maker-brief.html
{{- with $.Site.Params.makeThings -}}
I {{ $.Site.Params.makeVerb | default "make" }}
{{ if (eq (len .) 1) }}
{{ with first 1 . }}
{{- . | markdownify -}}
{{ end }}
{{- else if (eq (len .) 2) }}
{{- delimit . " and " | markdownify -}}
{{- else }}
{{- delimit . ", " ", and " | markdownify -}}
{{- end -}}
{{- with $.Site.Params.makeFocus }}
with a focus on {{ .  | markdownify }}
{{- end -}}
.
{{- end -}}
#+end_src
**** Pages Listing
#+begin_src html :tangle ./layouts/partials/pages-listing.html
  {{ with .Pages }}
    <ul>
      {{ range sort . "Title" "asc" }}
	<li>
	  {{ partial "page-description" . }}
	</li>
      {{ end }}
    </ul>
  {{ end }}
#+end_src
**** Personal Summary Section
     :PROPERTIES:
     :CUSTOM_ID: personal-summary-section
     :END:
#+begin_src html :tangle ./layouts/partials/personal-summary-section.html
  <section class="personal-summary">
    <p>
      {{ partial "personal-whatido-span.html" . }}
      {{ partial "personal-recent-actions-span.html" . }}
    </p>
    <p>
      {{ partial "personal-current-plans-span.html" . }}
      {{ partial "personal-soon-plans-span.html" . }}
    </p>
    {{ if (eq $.Site.Params.showHCard true) }}
      {{ partial "h-card-paragraph.html" . }}
    {{ end }}

  </section>
#+end_src
**** Personal "What I Do" Span
#+begin_src html :tangle ./layouts/partials/personal-whatido-span.html
  <span class="what-i-do">
  {{- with $.Site.Params.makeThings -}}
    I {{ $.Site.Params.makeVerb | default "make" }}
    {{ if (eq (len .) 1) }}
      {{ with first 1 . }}
	{{- index . 1 | markdownify -}}
      {{ end }}
    {{- else if (eq (len .) 2) }}
      {{- delimit . " and " | markdownify -}}
    {{- else }}
      {{- delimit . ", " ", and " | markdownify -}}
    {{- end -}}
    {{- with $.Site.Params.makeFocus }}
      with a focus on {{ .  | markdownify }}
    {{- end -}}
    .
  {{- end -}}
  </span>
#+end_src
**** Personal Recent Actions Span
#+begin_src html :tangle ./layouts/partials/personal-recent-actions-span.html
  {{ with $.Site.Data.personalData.activities }}
    <span class="recent-actions">
      Recently, I
      {{ $scratch := newScratch -}}
      {{- $scratch.Set "activityData" . -}}
      {{- $scratch.Set "recentActivities" slice -}}
      {{- range $date,$activities := . -}}
	{{- $scratch.Add "dates" (slice .) -}}
      {{- end -}}
      {{- range sort ($scratch.Get "dates") "value" "desc" -}}
	{{- $scratch.Add "activities" (slice .) -}}
      {{- end -}}
      {{- range last 3 ($scratch.Get "activities") -}}
	{{- $scratch.Add "recentActivities" . -}}
      {{- end -}}
      {{- with ($scratch.Get "recentActivities") -}}
	{{- if (eq (len .) 0) -}}
	{{- else -}}
	  {{- if (eq (len .) 1) -}}
	    {{- ( . | markdownify) -}}
	  {{- else if (eq (len .) 2) -}}
	    {{- (delimit . " and ") | markdownify -}}
	  {{- else -}}
	    {{- (delimit . ", " ", and ") | markdownify -}}
	  {{- end -}}
	{{- end -}}
      {{- end -}}
    .
  {{ end }}
#+end_src
**** Personal Current Plans Span
#+begin_src html :tangle ./layouts/partials/personal-current-plans-span.html
  <span class="current-plans">
    Currently, I am {{ partial "plans-delimiter.html" $.Site.Data.personalData.plans.current }}.
  </span>
#+end_src
**** Personal Soon Plans Span
#+begin_src html :tangle ./layouts/partials/personal-soon-plans-span.html
  <span class="current-plans">
    Soon, I plan to {{ partial "plans-delimiter.html" $.Site.Data.personalData.plans.soon }}.
  </span>
#+end_src
**** Plans Delimiter
#+begin_src html :tangle ./layouts/partials/plans-delimiter.html
{{- $scratch := newScratch -}}
{{- range . -}}
  {{- $scratch.Add "plans" (slice ( . | markdownify )) -}}
{{- end -}}
{{- with ($scratch.Get "plans") -}}
{{- if (eq (len .) 0) -}}{{- else -}}
  {{- if (eq (len .) 1) }}
      {{ . }}
    {{- else if (eq (len .) 2) }}
      {{ delimit . " and " }}
    {{- else }}
      {{ delimit (first 3 .) ", " ", and " }}
    {{- end -}}
  {{- end -}}
{{- end -}}
#+end_src

**** Plans Listing
#+begin_src html :tangle ./layouts/partials/plans-listing.html
{{- $scratch := newScratch -}}
{{- range . -}}
  {{- $scratch.Add "plans" (slice ( . | markdownify )) -}}
{{- end -}}
{{- with ($scratch.Get "plans") -}}
{{- if (eq (len .) 0) -}}{{- else -}}
<ul>
{{- range first 3 . -}}
<li>{{ . }}</li>
{{- end -}}
</ul>
{{- end -}}{{- end -}}
#+end_src
**** Recent Activities Brief
#+begin_src html :tangle ./layouts/partials/recent-activities-brief.html
{{- $scratch := newScratch -}}
{{- $scratch.Set "activityData" . -}}
{{- $scratch.Set "recentActivities" slice -}}
{{- range $date,$activities := . -}}
{{- $scratch.Add "dates" (slice .) -}}
{{- end -}}
{{- range sort ($scratch.Get "dates") "value" "desc" -}}
{{- $scratch.Add "activities" (slice .) -}}
{{- end -}}
{{- range last 3 ($scratch.Get "activities") -}}
{{- $scratch.Add "recentActivities" . -}}
{{- end -}}
{{- with ($scratch.Get "recentActivities") -}}
{{- if (eq (len .) 0) -}}
{{- else -}}
  {{- if (eq (len .) 1) -}}
      {{- . -}}
    {{- else if (eq (len .) 2) -}}
      {{- delimit . " and " -}}
{{- else -}}
{{- delimit . ", " ", and " -}}
    {{- end -}}
{{- end -}}
{{- end -}}
#+end_src
**** Recent Activities Listing
#+begin_src html :tangle ./layouts/partials/recent-activities-listing.html
{{ $scratch := newScratch }}
    {{ with .Site.Data.personalData.activities }}
      <h2>My Recent Activites</h2>
      <ul>
	{{ range $date, $report := . }}
	  {{ $scratch.Add "activityDates" (slice $date) }}
	{{ end }}
	{{ range ($scratch.Get "activityDates") }}
	    <li>
	      {{ (printf "**%s**" (dateFormat "January 2, 2006" .)) | markdownify -}}
	      {{- with (index $.Site.Data.personalData.activities .) -}}
		{{- if (eq (len .) 1) -}}
		  {{- (printf ": %s" (markdownify (index . 0)) | safeHTML) -}}
		{{- else -}}
		  <ul>
		    {{ range . }}
		      <li>{{ . | safeHTML | markdownify }}</li>
		    {{ end }}
		  </ul>
		{{ end }}
	      {{ end }}
	    </li>
	{{ end }}
      </ul>
    {{ end }}
#+end_src
**** DRAFT Recentest Page Brief
#+begin_src html :tangle ./layouts/partials/recentest-page-brief.html
The page most recently added to this website is
{{ range first 1 .Pages.ByPublishDate.Reverse }}
<a href="{{.Permalink}}">{{.Title}}</a>, a(n)
{{ .Type}}: "{{ .Description }}"
{{ end }}
#+end_src
**** DRAFT Recentest Page Span
#+begin_src html :tangle ./layouts/partials/recentest-page-span.html
  <span class="recentest-page">
    The page most recently added to this website is
    {{- range first 1 $.Site.Pages.ByPublishDate.Reverse }}
      <a href="{{- .Permalink -}}">{{- .Title -}}</a>, a(n)
      {{ .Type | singularize -}}
      {{- with .Description -}}
	: "{{- . -}}"
      {{- else -}}
	.
      {{- end -}}
    {{- end -}}
  </span>
#+end_src
**** DRAFT Section Count
#+begin_src html :tangle ./layouts/partials/section-count.html :padlines no
{{- $sectionCount := (len (where .Site.RegularPages "Type" .Section)) -}}
{{- $sectionCount }} <a href="{{ .Section }}/">{{- if (eq $sectionCount 1) -}}{{- .Section | humanize | lower | singularize -}}{{- else -}}{{- .Section | humanize | lower -}}{{- end -}}</a>{{- printf "" -}}
#+end_src

Why does this end in an empty printf statement? Otherwise the template returns ending in a newline and that'd need to be stripped away every time!

**** DRAFT Site Contents Brief
#+begin_src html :tangle ./layouts/partials/site-contents-brief.html
#+end_src
**** DRAFT Site Contents Listing
#+begin_src html :tangle ./layouts/partials/site-contents-listing.html
  {{- $scratch := newScratch -}}
  {{- range where $.Site.RegularPages ".File.TranslationBaseName" "in" $.Site.Params.mainPages -}}
    {{- $scratch.Add "mainPagePhrases" (slice ((printf "<a href=\"%s\">%s</a>" .Permalink .Params.indexPhrase) | safeHTML)) -}}
  {{- end -}}
  {{- $mPP := ($scratch.Get "mainPagePhrases") -}}
  {{- range $.Site.Params.mainSections -}}
    {{ if (eq (len (where $.Site.RegularPages "Type" .)) 0) }}{{ else }}
    {{- $scratch.Add "mainSectionCounts" (slice (partial "section-count.html" (dict "Section" . "Site" $.Site))) -}}
    {{ end }}
  {{- end -}}
  {{- $mS := ($scratch.Get "mainSectionCounts") -}}



  {{- if (eq (len $mPP) 0) -}}
  {{- else -}}
  <ul>
  {{- range $mPP -}}<li><a href="{{ . }}">{{ . }}</a></li>{{ end }}
  </ul>
  {{ end }}

  {{- if (eq (len $mS) 0) }}
  {{- else }}
  <ul>
  {{- range $mS -}}<li><a href="{{ . }}">{{ . }}</a></li>{{ end }}
  </ul>
  {{ end }}
#+end_src
**** Site Overview Section
     :PROPERTIES:
     :CUSTOM_ID: site-overview-section
     :END:
#+begin_src html :tangle ./layouts/partials/site-overview-section.html
  <p>
    {{ partial "site-main-pages-span.html" .}}
    {{ partial "recentest-page-span.html" . }}
    In total, this website has around {{ (partial "total-fuzzy-word-count.html" .) | humanize }} words.
  </p>
  {{ partial "site-main-sections-listing.html" . }}
  {{ partial "site-tags-listing.html" . }}
#+end_src
**** Site Main Pages Span
     :PROPERTIES:
     :CUSTOM_ID: site-main-pages-span
     :END:
#+begin_src html :tangle ./layouts/partials/site-main-pages-span.html
  {{- $scratch := newScratch -}}
  {{- range where $.Site.RegularPages ".File.TranslationBaseName" "in" $.Site.Params.mainPages -}}
    {{- $scratch.Add "mainPagePhrases" (slice (printf "<a href=\"%s\">%s</a>" .Permalink .Params.mainPhrase)) -}}
  {{- end -}}
  {{- $mPP := ($scratch.Get "mainPagePhrases") -}}

  {{- if (eq (len $mPP) 0) -}}
  {{- else -}}
  This website has pages to
  {{- if (eq (len $mPP) 1) }}
  {{ (index $mPP 0) }}
  {{- else if (eq (len $mPP) 2) }}
  {{ delimit $mPP " and " }}
  {{- else }}
  {{ delimit $mPP ", " ", and " }}
  {{- end -}}
  .
  {{- end -}}

#+end_src
**** DRAFT Site Tags Brief
#+begin_src html :tangle ./layouts/partials/site-tags-brief.html
Pages on this website are sometimes given tags to indicate their topic(s). There are
{{ $scratch := newScratch }}
{{ range .Site.Taxonomies.tags }}
{{ $scratch.Add "tags" (slice (printf "%s page(s) tagged \"<a href=\"%s\">%s</a>\"" (string .Count) .Page.Permalink (.Page.Title | humanize) )) }}
{{ end }}
<ul><li>
{{ delimit ($scratch.Get "tags") ",</li><li>" ", and</li><li>" }}
</li></ul>
#+end_src
**** DRAFT Site Tags Span
#+begin_src html :tangle ./layouts/partials/site-tags-span.html
<span class="site-tags">
</span>
#+end_src
**** Site Main Sections Listing
#+begin_src html :tangle ./layouts/partials/site-main-sections-listing.html
  {{ $scratch := newScratch }}
  {{- range $.Site.Params.mainSections -}}
    {{ if (eq (len (where $.Site.RegularPages "Type" .)) 0) }}{{ else }}
    {{- $scratch.Add "mainSectionCounts" (slice (partial "section-count.html" (dict "Section" . "Site" $.Site))) -}}
    {{ end }}
  {{- end -}}
  {{- $mS := ($scratch.Get "mainSectionCounts") -}}
  {{- if (eq (len $mS) 0) }}
  {{- else }}
  This website contains pages of the follow types:
  <ul><li>
  {{- if (eq (len $mS) 1) }}
  {{ (index $mS 0) }}</li>
  {{- else if (eq (len $mS) 2) }}
  {{ delimit $mS ",</li><li> " }}
  {{- else }}
  {{ delimit $mS ",</li><li> " ", and</li><li> " }}.</li>
  {{- end -}}
  </ul>
  {{- end -}}

</span>
#+end_src

**** Site Tags Listing
#+begin_src html :tangle ./layouts/partials/site-tags-listing.html
Pages on this website are sometimes given tags to indicate their topic(s).

{{ $scratch := newScratch }}
{{ range .Site.Taxonomies.tags }}
{{ $scratch.Add "tags" (slice (printf "\"<a href=\"%s\">%s</a>\" has been applied to %s page(s)" .Page.Permalink (replace .Page.Title "-" " ") (string .Count)  )) }}
{{ end }}
<ul><li>
{{ delimit ($scratch.Get "tags") ",</li><li>" ", and</li><li>" }}.
</li></ul>
#+end_src

**** Total Word Count
#+begin_src html :tangle ./layouts/partials/total-word-count.html
{{ $scratch := newScratch }}
{{ range $.Site.RegularPages }}{{ $scratch.Add "totalWordCount" .WordCount }}{{ end }}
{{ $scratch.Get "totalWordCount" }}
#+end_src
**** Total Fuzzy Word Count
#+begin_src html :tangle ./layouts/partials/total-fuzzy-word-count.html
{{ $scratch := newScratch }}
{{ range $.Site.Pages }}{{ $scratch.Add "totalWordCount" .FuzzyWordCount }}{{ end }}
{{ $scratch.Get "totalWordCount" }}
#+end_src
**** Webmention Feed
#+begin_src html :tangle ./layouts/partials/webmention-feed.html
{{ $mentions := getJSON (add "https://webmention.io/api/mentions.jf2?target=" .Permalink) }}
{{ $mentions.name | default "Webmentionssss" }}
{{ with $mentions.children }}
<ul>{{ range . }}
<li>{{ . }}</li>
{{ end }}{{ end }}
#+end_src
**** Who Am I
#+begin_src html :tangle ./layouts/partials/who-am-i.html
{{- with $.Site.Params.givenName -}}
{{- (printf "<span class=\"given-name\">%s</span>" .) | safeHTML -}}
{{- end -}}
{{- with $.Site.Params.familyName -}}
{{- (printf "<span class=\"family-name\">%s</span>" .) | safeHTML -}}
{{- end -}}
#+end_src
* Supplements
#+TOC: headlines 1 local
** Index
- JSON ::
- HTML ::
- Markdown ::
- Hugo ::
** README
   :PROPERTIES:
   :EXPORT_FILE_NAME: ./README
   :END:
#+INCLUDE: "./source.org::#introduction" :only-contents t
** Source
The following is the source of this document as it was written by the
author.
#+INCLUDE:  "./source.org" src org

* Footnotes

[fn:1] Hugo's documentation seems to use /layout/ and /template/ interchangeably, or there's a logic to it I've never understood. I will be using the word /template/ throughout.
```

[^fn:1]: Hugo's documentation seems to use _layout_ and _template_ interchangeably, or there's a logic to it I've never understood. I will be using the word _template_ throughout.