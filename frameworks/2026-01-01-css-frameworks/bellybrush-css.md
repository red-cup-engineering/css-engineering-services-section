+++
title = "Bellybrush CSS"
author = ["emsenn"]
tags = ["CSS"]
draft = false
+++

## Introduction {#introduction}

**_Bellybrush Theme_** is a CSS theme for styling _Teraum_ reference
books and other materials.


## Bellybrush Theme {#bellybrush-theme}


### Design Philosophy {#design-philosophy}

The _Bellybrush Theme_ theme is based on my own **Oats**, which is based
on another of my themes, **Brutstrap** which claims to style content as
it's constructed.

However, _Brutstrap_ is catered toward a rather stark aesthetic, to make
it more readily match the [brutalism](https://brutalist-web.design) advocated by [David Bryant
Copeland](https://naildrivin5.com/).

Bellybrush is more light-hearted. It's designed to be used for a set
of reference books I'm written for a funny fantasy setting, and so
hopefully reflects that.


### CSS Rules {#css-rules}


#### Base Rules {#base-rules}

The theme's **_base rules_** are those that go with HTML tags directly.


##### HTML Tag Rules {#html-tag-rules}

Document-wide settings, including those relevant to font-styling, are
declared in the `html` rule.

```css
html {
    color: #444;
    background-color: #eee;
    hyphens: auto;
    font-family: sans-serif;
    letter-spacing: .03em;
    word-spacing: .05em;
    line-height: 1.4;
    font-size: 1.3rem;
}
```

These colors are the lowest-contrast, three-digit hex codes that still
pass [WCAG2 AAA](https://www.w3.org/TR/WCAG20/). Adding some spacing between letters and words helps
make the document feel a little more "friendly," and makes it a little
safer to use more distinctive fonts in your body text.


##### Body Tag Rules {#body-tag-rules}

```css
body {
    width:85vw;
    max-width:40rem;
    margin:0 2rem;
    padding:3rem 2rem 6rem;}
  }
```


##### Header Tag Rules {#header-tag-rules}

```css
header {
    overflow: hidden;
    padding: 1rem 0 3rem 0;
    background: linear-gradient(to bottom, #eeef 92%, #eee0);
}
```


##### Main Tag Rules {#main-tag-rules}

```css
main{
    width: 80vw;
    max-width: 40rem;
    margin: -4rem 1em -6rem;
    padding: 3rem 2rem 6rem;
    background: linear-gradient(to right, #eee0, #eeef 02%, #eeef 98%, #eee0);
}
```


##### Footer Tag Rules {#footer-tag-rules}

```css
footer {
    padding: 4rem 1rem 1rem;
    background: linear-gradient(to top, #eeef 97%, #eee0);
}
```


##### Headline Tag Rules {#headline-tag-rules}


###### H1 Tag Rules {#h1-tag-rules}

```css
h1 {
    font-weight: normal;
    font-size: 2.8em;
    margin: 0 auto;
    text-align: left;
    padding: 0 .5em;
}
```


###### H2 through H6 Tag Rules {#h2-through-h6-tag-rules}

```css
h2 {
  font-size: 2.3em;
}
h3 {
  font-size: 2.1em;
}
h4 {
  font-size: 1.9em;
}
h5 {
  font-size: 1.7em;
}
h6 {
  font-size: 1.5em;
}
```


##### Link Tag Rules {#link-tag-rules}

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


##### Image Tag Rules {#image-tag-rules}

```css
img {
    max-width: 100%;
    max-height: 20em;
}
```


#### Partials Rules {#partials-rules}


##### Skip-to-Content Rules {#skip-to-content-rules}

```css
.skipToContentLink {
  opacity: 0;
  position: absolute;
}
.skipToContentLink:focus{
    opacity:1
}
```


##### Table Rules {#table-rules}

```css

```


#### State Rules {#state-rules}


##### Selection Rules {#selection-rules}

```css
::selection {
    color: #222;
    background-color: #777;
}
```