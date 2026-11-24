+++
title = "Brutstrap CSS"
author = ["emsenn"]
tags = ["CSS"]
draft = false
+++

<div class="ox-hugo-toc toc local">
<div></div>

- [Introduction](#introduction)
- [Brutstrap CSS](#brutstrap-css)
    - [Principles](#principles)
    - [Implementation](#implementation)
        - [Document Framing](#document-framing)
        - [Block Design](#block-design)
        - [Typography](#typography)
        - [State Rules](#state-rules)
        - [Class Rules](#class-rules)
    - [Acknowledgements](#supplements-acknowledgements)
- [Supplements](#supplements)
    - [Document History](#document-history)
    - [Example Texts](#example-texts)
        - [Complete Stylesheet](#complete-stylesheet)
        - [Demonstration HTML](#demonstration-html)
    - [Index](#index)
    - [Org-mode Block for Tangling as Org-Mode HTML Header](#org-mode-block-for-tangling-as-org-mode-html-header)
    - [README](#readme)
        - [Brutstrap CSS](#brutstrap-css)

</div>
<!--endtoc-->


## Introduction {#introduction}

In this document I explain the design philosophy and implementation of
my **Brutstrap** CSS theme: one where the webpage, as shown in the
browser, is an accurate representation of the HTML document it is
displaying.


## Brutstrap CSS {#brutstrap-css}

**_Brutstrap_** is my CSS theme based on David Bryant Copeland's ["Guidelines for Brutalist Web Design,"](https://brutalist-web.design/) which advocates "_raw content true to its construction_."


### Principles {#principles}

-   **_The website people see is the website in the HTML file._** As David Byant Copeland says in his definition, brutalist websites should be "raw content, true to [their] construction." Here, that means the content is represented as a single column, flowing left to right and top to bottom.
-   **_Only links, inputs and buttons should respond to interaction._** A website should allow two points of interaction: a hyperlink that brings you to a destination, and form which submits information to a server. Those elements, and only those elements, should respond to being clicked, focused, or hovered-over.
-   **_Components should be named what they are._** Classes should be named what they are, not what they're for.
-   **_Design should be helpful._** Styling should be to help reinforce the context that your content has.


### Implementation {#implementation}

**_NOTE:_** Because I use Org-mode, this CSS is written with rules
compatible with its naming scheme.


#### Document Framing {#document-framing}


##### Body {#body}

<a id="code-snippet--brutstrap-body"></a>
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
```


##### Header & Title {#header-and-title}

<a id="code-snippet--brutstrap-header"></a>
```css
header, h1 {
  font-family: sans-serif;
  text-align: center;
  width: 100%;
  overflow: hidden;
  font-family: sans-serif;
}
.title { font-size: 3.2rem; }
.subtitle { font-size: 2.2rem; }
```


##### Content Container {#content-container}

<a id="code-snippet--brutstrap-content"></a>
```css
main, #content {
  width: 75vw;
  max-width: 40em;
  margin: 0 0 0 2em;
  line-height: 1.6;
  margin-bottom: 8rem;
}
```


##### Footer {#footer}

<a id="code-snippet--brutstrap-footer"></a>
```css
footer, #postamble {
  padding: 1em 0;
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
}
```


#### Block Design {#block-design}


##### Section {#section}

<a id="code-snippet--brutstrap-section"></a>
```css
section {
  border-bottom: 0.1em solid #444;
  margin-bottom: 1em;
}
.outline-3 {
  border-bottom: 0.1rem dotted #444;
}
```


##### Blockquote {#blockquote}

<a id="code-snippet--brutstrap-blockquote"></a>
```css
blockquote {
  padding: 0.5rem;
  border-left: 0.1em solid #444;
}
```


##### Table {#table}

<a id="code-snippet--brutstrap-table"></a>
```css
table {
    border-collapse: collapse;
    border-spacing: 0;
    empty-cells: show;
    border: 0.1em solid #444;
}
thead { font-family: sans-serif; }
td {
  padding: 0 0.3em;
  border: 0.01em solid #444;
}
```


##### Images {#images}

<a id="code-snippet--brutstrap-images"></a>
```css
img {
  max-width: 80vw;
  vertical-align: middle;
}
```


##### Code {#code}

<a id="code-snippet--brutstrap-code"></a>
```css
pre, .src {
  padding: 0.5em;
  border: 0.1em solid #444;
  white-space: pre-wrap;
  overflow-x: scroll;
  text-overflow: clip;
}
```


##### Dictionary List {#dictionary-list}

<a id="code-snippet--brutstrap-dictionary-list"></a>
```css
dt {
  font-weight: normal;
  display: inline-block;
  border-bottom: 0.1rem dotted #444;
}
#text-index dt { border-bottom: none; }
```


#### Typography {#typography}


##### Headlines {#headlines}

<a id="code-snippet--brutstrap-headlines"></a>
```css
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
```


##### Links {#links}

<a id="code-snippet--brutstrap-links"></a>
```css
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
```


#### State Rules {#state-rules}


##### Selection Rules {#selection-rules}

<a id="code-snippet--brutstrap-selection"></a>
```css
::selection { background-color: #777; color: #eee; }
a::selection { background-color: #ccc; }
```


#### Class Rules {#class-rules}


##### TODO {#todo}

<a id="code-snippet--brutstrap-todo"></a>
```css
.todo {
  background-color: #ddd;
  color: #333;
  font-size: .8rem;
  float: right;
}
```


##### Example under Source {#example-under-source}

<a id="code-snippet--brutstrap-example-under-source"></a>
```css
.org-src-container + .example {
  margin-left: 8em;
}
```


##### Listing Captions {#listing-captions}

<a id="code-snippet--brutstrap-listing-captions"></a>
```css
label.org-src-name {
  margin: 0 0 0 3em;
  font-family: sans-serif;
  font-size: 1rem;
  line-height: 0;
}
```


### Acknowledgements {#supplements-acknowledgements}

-   [David Bryant Copeland](https://naildrivin4.com) defined "brutalist web design," inspiring this
    project.
-   Whoever made the [motherfucking website](https://motherfuckingwebsite.com).
-   [Matthew Graybosch](https://www.matthewgraybosch.com), whose [variation](https://codepen.io/demifiend/pen/EENKNN) on the motherfucking website made
    learning HTML and CSS seem feasible and worthwhile.


## Supplements {#supplements}


### Document History {#document-history}

| Date       | Event                                                                             |
|------------|-----------------------------------------------------------------------------------|
| 2018-07-09 | Created first draft                                                               |
| 2018-07-11 | Added introduction for readers from [_Hacker News_](https://news.ycombinator.com) |
| 2018-07-31 | Removed introduction for _Hacker News_                                            |
| 2019-04-29 | Re-implemented as a literately-programmed Org-mode file                           |


### Example Texts {#example-texts}


#### Complete Stylesheet {#complete-stylesheet}

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
header, h1 {
  font-family: sans-serif;
  text-align: center;
  width: 100%;
  overflow: hidden;
  font-family: sans-serif;
}
.title { font-size: 3.2rem; }
.subtitle { font-size: 2.2rem; }
main, #content {
  width: 75vw;
  max-width: 40em;
  margin: 0 0 0 2em;
  line-height: 1.6;
  margin-bottom: 8rem;
}
footer, #postamble {
  padding: 1em 0;
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
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
td {
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
```


#### Demonstration HTML {#demonstration-html}

```html
<!doctype html>
<html lang="en">
<head>
  <link rel="stylesheet" type="text/css" href="./brutstrap.css">
</head>
<body>
  <header>
    <h1 role="banner">Brutstrap</h1>
    <h2>CSS for bootstrapping a brutalist website.</h2>
    <nav role="navigation">
      <ul>
	<li><a href="#principles">Principles</a></li>
	<li><a href="#usage">Usage</a></li>
	<li><a href="#features">Features</a></li>
      </ul>
    </nav>
  </header>
  <main role="main">
      <h3>Summary</h3>
      <p>
	<strong>Brutstrap</strong> is a CSS theme for building a
	brutalist website: one where the website, as shown in your
	browser, is an accurate representation of the HTML document it
	is displaying.
      </p>
    </section>
  </main>
  <footer>
    <section>
      <p>
	This is a demonstration of an HTML document and not meant for public use.
      </p>
    </section>
  </footer>
</body>
</html>
```


### Index {#index}

Brutalism
:


Brutstrap CSS
:


CSS
:


HTML
:


### Org-mode Block for Tangling as Org-Mode HTML Header {#org-mode-block-for-tangling-as-org-mode-html-header}

```org
#+HTML_HEAD: <style>
#+HTML_HEAD: body {
#+HTML_HEAD:   position: relative;
#+HTML_HEAD:   background-color: #eee;
#+HTML_HEAD:   color: #444;
#+HTML_HEAD:   font-family: serif;
#+HTML_HEAD:   margin: 0 auto;
#+HTML_HEAD:   padding-bottom: 6rem;
#+HTML_HEAD:   min-height: 100%;
#+HTML_HEAD:   font-size: 1.2em;
#+HTML_HEAD: }
#+HTML_HEAD: header, h1 {
#+HTML_HEAD:   font-family: sans-serif;
#+HTML_HEAD:   text-align: center;
#+HTML_HEAD:   width: 100%;
#+HTML_HEAD:   overflow: hidden;
#+HTML_HEAD:   font-family: sans-serif;
#+HTML_HEAD: }
#+HTML_HEAD: .title { font-size: 3.2rem; }
#+HTML_HEAD: .subtitle { font-size: 2.2rem; }
#+HTML_HEAD: main, #content {
#+HTML_HEAD:   width: 75vw;
#+HTML_HEAD:   max-width: 40em;
#+HTML_HEAD:   margin: 0 0 0 2em;
#+HTML_HEAD:   line-height: 1.6;
#+HTML_HEAD:   margin-bottom: 8rem;
#+HTML_HEAD: }
#+HTML_HEAD: footer, #postamble {
#+HTML_HEAD:   padding: 1em 0;
#+HTML_HEAD:   position: absolute;
#+HTML_HEAD:   right: 0;
#+HTML_HEAD:   bottom: 0;
#+HTML_HEAD:   left: 0;
#+HTML_HEAD: }
#+HTML_HEAD: section {
#+HTML_HEAD:   border-bottom: 0.1em solid #444;
#+HTML_HEAD:   margin-bottom: 1em;
#+HTML_HEAD: }
#+HTML_HEAD: .outline-3 {
#+HTML_HEAD:   border-bottom: 0.1rem dotted #444;
#+HTML_HEAD: }
#+HTML_HEAD: blockquote {
#+HTML_HEAD:   padding: 0.5rem;
#+HTML_HEAD:   border-left: 0.1em solid #444;
#+HTML_HEAD: }
#+HTML_HEAD: table {
#+HTML_HEAD:     border-collapse: collapse;
#+HTML_HEAD:     border-spacing: 0;
#+HTML_HEAD:     empty-cells: show;
#+HTML_HEAD:     border: 0.1em solid #444;
#+HTML_HEAD: }
#+HTML_HEAD: thead { font-family: sans-serif; }
#+HTML_HEAD: td {
#+HTML_HEAD:   padding: 0 0.3em;
#+HTML_HEAD:   border: 0.01em solid #444;
#+HTML_HEAD: }
#+HTML_HEAD: img {
#+HTML_HEAD:   max-width: 80vw;
#+HTML_HEAD:   vertical-align: middle;
#+HTML_HEAD: }
#+HTML_HEAD: pre, .src {
#+HTML_HEAD:   padding: 0.5em;
#+HTML_HEAD:   border: 0.1em solid #444;
#+HTML_HEAD:   white-space: pre-wrap;
#+HTML_HEAD:   overflow-x: scroll;
#+HTML_HEAD:   text-overflow: clip;
#+HTML_HEAD: }
#+HTML_HEAD: dt {
#+HTML_HEAD:   font-weight: normal;
#+HTML_HEAD:   display: inline-block;
#+HTML_HEAD:   border-bottom: 0.1rem dotted #444;
#+HTML_HEAD: }
#+HTML_HEAD: #text-index dt { border-bottom: none; }
#+HTML_HEAD: h2, h3, h4, h5, h6, h7, h8, h9, h10 {
#+HTML_HEAD:   display: block;
#+HTML_HEAD:   font-family: sans-serif;
#+HTML_HEAD:   margin: 0.5em;
#+HTML_HEAD: }
#+HTML_HEAD: h2 {
#+HTML_HEAD:   text-align: center;
#+HTML_HEAD: }
#+HTML_HEAD: h2 { font-size: 2em; }
#+HTML_HEAD: h3 {
#+HTML_HEAD:   font-size: 1.8em;
#+HTML_HEAD: }
#+HTML_HEAD: h4 {
#+HTML_HEAD:   font-size: 1.6em;
#+HTML_HEAD: }
#+HTML_HEAD: h5 {
#+HTML_HEAD:   font-size: 1.4em;
#+HTML_HEAD:   margin: 0.5em 0 0.2em 10%;
#+HTML_HEAD: }
#+HTML_HEAD: h6 {
#+HTML_HEAD:   font-size: 1.2em;
#+HTML_HEAD:   margin: 0.5em 0 0.2em 30%;
#+HTML_HEAD: }
#+HTML_HEAD: a {
#+HTML_HEAD:   text-decoration: none;
#+HTML_HEAD:   color: #3ac;
#+HTML_HEAD:   display: inline;
#+HTML_HEAD:   position: relative;
#+HTML_HEAD:   border-bottom: 0.1rem dotted;
#+HTML_HEAD:   line-height: 1.2;
#+HTML_HEAD:   transition: border 0.3s;
#+HTML_HEAD: }
#+HTML_HEAD: a:hover {
#+HTML_HEAD:   color: #5ce;
#+HTML_HEAD:   outline-style: none;
#+HTML_HEAD:   border-bottom: 0.1rem solid;
#+HTML_HEAD: }
#+HTML_HEAD: a:visited { color: #b8c; }
#+HTML_HEAD: a:visited:hover { color: #dae; }
#+HTML_HEAD: a:focus {
#+HTML_HEAD:   outline-style: none;
#+HTML_HEAD:   border-bottom: 0.1rem solid;
#+HTML_HEAD: }
#+HTML_HEAD: ::selection { background-color: #777; color: #eee; }
#+HTML_HEAD: a::selection { background-color: #ccc; }
#+HTML_HEAD: .todo {
#+HTML_HEAD:   background-color: #ddd;
#+HTML_HEAD:   color: #333;
#+HTML_HEAD:   font-size: .8rem;
#+HTML_HEAD:   float: right;
#+HTML_HEAD: }
#+HTML_HEAD: .org-src-container + .example {
#+HTML_HEAD:   margin-left: 8em;
#+HTML_HEAD: }
#+HTML_HEAD: label.org-src-name {
#+HTML_HEAD:   margin: 0 0 0 3em;
#+HTML_HEAD:   font-family: sans-serif;
#+HTML_HEAD:   font-size: 1rem;
#+HTML_HEAD:   line-height: 0;
#+HTML_HEAD: }
#+HTML_HEAD: </style>
```


### README {#readme}


#### Brutstrap CSS {#brutstrap-css}

In this document I explain the design philosophy and implementation of
my **Brutstrap** CSS theme: one where the webpage, as shown in the
browser, is an accurate representation of the HTML document it is
displaying.