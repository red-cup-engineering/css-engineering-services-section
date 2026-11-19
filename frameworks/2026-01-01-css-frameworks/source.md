+++
title = "Oats CSS"
author = ["emsenn"]
description = "A CSS stylesheet"
tags = ["css"]
draft = false
+++

## Introduction {#introduction}

**_Oats_** is a simple and neutral CSS theme created by [emsenn](https://emsenn.net).


### License and Editorial Information {#license-and-editorial-information}

This document and the source code it contains are released under the
MIT License and maintained at <https://git.sr.ht/~emsenn/oats>.

<div class="ox-hugo-toc toc">
<div></div>

<div class="heading">Table of Contents</div>

- [Introduction](#introduction)
    - [License and Editorial Information](#license-and-editorial-information)
- [Design Philosophy](#design-philosophy)
- [CSS Rules](#css-rules)
    - [Base Rules](#base-rules)
        - [HTML Tag Rules](#html-tag-rules)
        - [Body Tag Rules](#body-tag-rules)
        - [Header Tag Rules](#header-tag-rules)
        - [Main Tag Rules](#main-tag-rules)
        - [Footer Tag Rules](#footer-tag-rules)
        - [Headline Tag Rules](#headline-tag-rules)
        - [Link Tag Rules](#link-tag-rules)
        - [Image Tag Rules](#image-tag-rules)
    - [Partials Rules](#partials-rules)
        - [Skip-to-Content Rules](#skip-to-content-rules)
    - [State Rules](#state-rules)
        - [Selection Rules](#selection-rules)
- [Demonstration HTML Document](#demonstration-html-document)

</div>
<!--endtoc-->


## Design Philosophy {#design-philosophy}

The _Oats_ theme is based on my own [_Brutstrap_](https://emsenn.net/projects/brutstrap/), which claims to style
content as it's constructed.

However, _Brutstrap_ is catered toward a rather stark aesthetic, to
make it more readily match the [brutalism](https://brutalist-web.design) advocated by [David Bryant
Copeland](https://naildrivin5.com/).

_Oats_ tries to be a little softer and more friendly. While
nothing about the stylesheet contradicts the brutalist priciples
Copeland provides, it does a little more styling than is strictly necessary.


## CSS Rules {#css-rules}

All of _Oats_ CSS lives in a single style-sheet, `oats.css`.


### Base Rules {#base-rules}

The theme's **_base rules_** are those that go with HTML tags directly.


#### HTML Tag Rules {#html-tag-rules}

Document-wide settings, including those relevant to font-styling, are
declared in the `html` rule.

```css
html {
  color: #444;
  background-color: #eee;
```

These colors are the lowest-contrast, three-digit hex codes that still
pass [WCAG2 AAA](https://www.w3.org/TR/WCAG20/).

```css
  hyphens: auto;
  font-family: sans-serif;
  letter-spacing: .03em;
  word-spacing: .05em;
  line-height: 1.4;
  font-size: 1.3rem;
}
```

Adding some spacing between letters and words helps make the document
feel a little more "friendly," and makes it a little safer to use more
distinctive fonts in your body text.


#### Body Tag Rules {#body-tag-rules}

```css
body {
  margin: 0;
}
```


#### Header Tag Rules {#header-tag-rules}

```css
header {
  overflow: hidden;
  padding: 1rem 0 3rem 0;
}
```


#### Main Tag Rules {#main-tag-rules}

```css
main{
  width: 85vw;
  max-width: 40rem;
  margin: -4rem auto -6rem;
  padding: 3rem 2rem 6rem;
}
```


#### Footer Tag Rules {#footer-tag-rules}

```css
footer {
  padding: 4rem 1rem 1rem;
}
```


#### Headline Tag Rules {#headline-tag-rules}


##### H1 Tag Rules {#h1-tag-rules}

```css
h1 {
  font-weight: normal;
  font-size: 2.8em;
  text-shadow: .08em .03em .03em rgba(68,68,68,.3);
  margin: 0;
  padding: 0 .5em;
}
```


##### H2 through H6 Tag Rules {#h2-through-h6-tag-rules}

```css
h2,h3,h4,h5,h6,h7,h8,h9 {
  text-align: center;
  font-style: bold;
  letter-spacing: 0.1em;
}
```


#### Link Tag Rules {#link-tag-rules}

```css
a {
  color: #31B;
  text-decoration: underline dotted #4447;
  text-shadow: 0 0 .1em rgba(68,68,68,.2);
}
a:visited {
  color: #718;
}
a:hover {
  color: #42C;
  outline-style: none;
  text-decoration: underline solid #42c3;
  text-shadow: 0 0 .1em #31b7;
}
a:focus {
  color: #42C;
  outline-style: none;
  text-decoration: underline solid #42c3;
  text-shadow: 0 0 .1em #31b7;
}
a:visited:hover, a:visited:focus {
  color: #918;
  text-decoration: underline solid #9183;
  text-shadow: 0 0 .1em #7187;
}
```


#### Image Tag Rules {#image-tag-rules}

```css
img {
  max-width: 100%;
  max-height: 20em;
}
```


### Partials Rules {#partials-rules}


#### Skip-to-Content Rules {#skip-to-content-rules}

```css
.skipToContentLink {
  opacity: 0;
  position: absolute;
}
.skipToContentLink:focus{
  opacity:1
}
```


### State Rules {#state-rules}


#### Selection Rules {#selection-rules}

```css
::selection {
  color: #222;
  background-color: #777;
}
```


## Demonstration HTML Document {#demonstration-html-document}

```html
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
  <head>
    <link href="https://gmpg.org/xfn/11" rel="profile">
    <meta charset="UTF-8">
    <meta name="description" content="Oats is a simple and neutral CSS theme.">
    <meta name="keywords" content="oats, css, theme">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" type="text/css" href="./oats.css">
    <title>Oats</title>
  </head>
  <body>
    <a class="skipToContentLink" href="#content">Skip to Content</a>
    <header>
      <h1>Oats</h1>
    </header>
    <main id="content">
      <p>
	Oats is a simple and neutral CSS theme.
      </p>
      <section id="features">
	<h2>Features</h2>
	<ul>
	  <li>
	    <strong>Very little,</strong> honestly.
	  </li>
	</ul>
      </section>
    </main>
  </body>
</html>
```