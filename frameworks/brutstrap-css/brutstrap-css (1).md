"Brutstrap" is a CSS theme created by emsenn.

-   [Introduction](#introduction)
-   [Brutstrap](#brutstrap)
    -   [Principles](#orgb091db9)
    -   [Usage](#org2e1d847)
    -   [Implementation](#org987e49f)
        -   [Document Framing](#org0c52302)
            -   [Body](#org1392ecf)
            -   [Header & Title](#orgda144ed)
            -   [Content Container](#org8f6c392)
            -   [Footer](#org70afb7d)
        -   [Block Design](#org55f1168)
            -   [Section](#org7d363d7)
            -   [Blockquote](#org0782980)
            -   [Table](#org43b678c)
            -   [Images](#orgcc0e5d1)
        -   [Typography](#orgd441b8b)
            -   [Headlines](#org1299d98)
            -   [Links](#orge8c8d5c)
            -   [Dictionary Terms](#org9d4cc78)
        -   [State Rules](#org02846a8)
            -   [Selection Rules](#orgfb2d697)
        -   [Class Rules](#orgd39b1ca)
            -   [Code Block Rules](#org89ffc93)
    -   [Acknowledgements](#supplements-acknowledgements)
-   [Supplements](#supplements)
    -   [Document History](#orgad0198c)
    -   [Example Texts](#orge1484f2)
        -   [Complete Stylesheet](#supplements-complete-stylesheet)
        -   [Demonstration HTML](#demonstration-html)
    -   [Index](#orgcba18f5)
    -   [Media Package](#media-package)
    -   [README](#orgedc9294)
        -   [Brutstrap](#org6408c09)


<a id="introduction"></a>

# Introduction

This CSS theme is a *draft*: it is unfinished and that should be considered when reading it. Special attention should be paid to text marked DRAFT, EDIT, or TK.

In this document I explain the design philosophy and implementation of my **Brutstrap** CSS theme: one where the webpage, as shown in the browser, is an accurate representation of the HTML document it is displaying.

This CSS theme was created by me, emsenn, in the United States. To the extent possible under law, I have waived all copyright and related or neighboring rights to this document. This document was created for the benefit of the public. If you're viewing it on a remote server, you're encouraged to download your own copy. To learn how you can support me, see [https://emsenn.net/donate](https://emsenn.net/donate).


<a id="brutstrap"></a>

# Brutstrap

***Brutstrap*** is a CSS theme based on David Bryant Copeland's ["Guidelines for Brutalist Web Design,"](https://brutalist-web.design/) which advocates "*raw content true to its construction*."


<a id="orgb091db9"></a>

## Principles

-   ***The website people see is the website in the HTML file.*** As David Byant Copeland says in his definition, brutalist websites should be "raw content, true to [their] construction." Here, that means the content is represented as a single column, flowing left to right and top to bottom.
-   ***Only links, inputs and buttons should respond to interaction.*** A website should allow two points of interaction: a hyperlink that brings you to a destination, and form which submits information to a server. Those elements, and only those elements, should respond to being clicked, focused, or hovered-over.
-   ***Components should be named what they are.*** Classes should be named what they are, not what they're for.
-   ***Design should be helpful.*** Styling should be to help reinforce the context that your content has.


<a id="org2e1d847"></a>

## Usage

**Brutstrap**'s stylesheet is available at [`./build/brutstrap/brutstrap.css`](./build/brutstrap/brutstrap.css), but please don't hotlink to it. You can also view the stylesheet under the ["Complete Stylesheet"](#supplements-complete-stylesheet) section.


<a id="org987e49f"></a>

## Implementation

***NOTE:*** Because I use Org-mode, this CSS is written with rules compatible with its naming scheme.


<a id="org0c52302"></a>

### Document Framing


<a id="org1392ecf"></a>

#### Body

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


<a id="orgda144ed"></a>

#### Header & Title

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


<a id="org8f6c392"></a>

#### Content Container

```css
main, #content {
  width: 75vw;
  max-width: 40em;
  margin: 0 0 0 2em;
  line-height: 1.6;
  margin-bottom: 8rem;
}
```


<a id="org70afb7d"></a>

#### Footer

```css
footer, #postamble {
  padding: 1em 0;
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
}
```


<a id="org55f1168"></a>

### Block Design


<a id="org7d363d7"></a>

#### Section

```css
section {
  border-bottom: 0.1em solid #444;
  margin-bottom: 1em;
}
```


<a id="org0782980"></a>

#### Blockquote

```css

blockquote {
  padding: 0.5rem;
  border-left: 0.1em solid #444;
}
```


<a id="org43b678c"></a>

#### Table

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


<a id="orgcc0e5d1"></a>

#### Images

```css
img {
  max-width: 80vw;
  vertical-align: middle;
}
```


<a id="orgd441b8b"></a>

### Typography


<a id="org1299d98"></a>

#### Headlines

```css
h2, h3, h4, h5, h6, h7, h8, h9, h10 {
  font-family: sans-serif;
  margin: 0.5em;
}
h2, h3 {
  text-align: center;
}
```


<a id="orge8c8d5c"></a>

#### Links

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


<a id="org9d4cc78"></a>

#### Dictionary Terms

```css
dt { font-weight: bold; }
```


<a id="org02846a8"></a>

### State Rules


<a id="orgfb2d697"></a>

#### Selection Rules

```css
::selection { background-color: #777; color: #eee; }
a::selection { background-color: #ccc; }
```


<a id="orgd39b1ca"></a>

### Class Rules


<a id="org89ffc93"></a>

#### Code Block Rules

```css
pre, .src {
  padding: 0.5em;
  border: 0.1em solid #444;
  white-space: pre-wrap;
  overflow-x: scroll;
  text-overflow: clip;
}
```


<a id="supplements-acknowledgements"></a>

## Acknowledgements

-   [David Bryant Copeland](https://naildrivin4.com) defined "brutalist web design," inspiring this project.
-   Whoever made the [motherfucking website](https://motherfuckingwebsite.com).
-   [Matthew Graybosch](https://www.matthewgraybosch.com), whose [variation](https://codepen.io/demifiend/pen/EENKNN) on the motherfucking website made learning HTML and CSS seem feasible and worthwhile.


<a id="supplements"></a>

# Supplements


<a id="orgad0198c"></a>

## Document History

| Date       | Event                                                                             |
|---------- |--------------------------------------------------------------------------------- |
| 2018-07-09 | Created first draft                                                               |
| 2018-07-11 | Added introduction for readers from [*Hacker News*](https://news.ycombinator.com) |
| 2018-07-31 | Removed introduction for *Hacker News*                                            |
| 2019-04-29 | Re-implemented as a literately-programmed Org-mode file                           |


<a id="orge1484f2"></a>

## Example Texts


<a id="supplements-complete-stylesheet"></a>

### Complete Stylesheet

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
h2, h3, h4, h5, h6, h7, h8, h9, h10 {
  font-family: sans-serif;
  margin: 0.5em;
}
h2, h3 {
  text-align: center;
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
dt { font-weight: bold; }
::selection { background-color: #777; color: #eee; }
a::selection { background-color: #ccc; }
pre, .src {
  padding: 0.5em;
  border: 0.1em solid #444;
  white-space: pre-wrap;
  overflow-x: scroll;
  text-overflow: clip;
}
```


<a id="demonstration-html"></a>

### Demonstration HTML

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


<a id="orgcba18f5"></a>

## Index

-   **Brutalism:** A style exaggerating the pragmatic functionality present in modernist design. See [https://en.wikipedia.org/wiki/Brutalist\_architecture](https://en.wikipedia.org/wiki/Brutalist_architecture)
-   **Brutstrap CSS:**

-   **CSS:**

-   **HTML:** A way of adding layout, formatting, and media to text documents. See [https://en.wikipedia.org/wiki/HTML](https://en.wikipedia.org/wiki/HTML).


<a id="media-package"></a>

## Media Package

```json
{"brutstrap-css": {
    "name": "Brutstrap CSS",
    "creator": "emsenn",
    "license": "CC0",
    "description": "a cascading stylesheet for representing HTML content as it is constructed.",
    "versions": {
	"current": {
	    "sourcehut": {
		"location": "https://git.sr.ht/~emsenn/brutstrap-css/blob/master/",
		"formats": ["html","md","pdf","tex","txt"]
	    }
	}
   }
}}
```


<a id="orgedc9294"></a>

## README


<a id="org6408c09"></a>

### Brutstrap

This CSS theme is a *draft*: it is unfinished and that should be considered when reading it. Special attention should be paid to text marked DRAFT, EDIT, or TK.

In this document I explain the design philosophy and implementation of my **Brutstrap** CSS theme: one where the webpage, as shown in the browser, is an accurate representation of the HTML document it is displaying.

This CSS theme was created by me, emsenn, in the United States. To the extent possible under law, I have waived all copyright and related or neighboring rights to this document. This document was created for the benefit of the public. If you're viewing it on a remote server, you're encouraged to download your own copy. To learn how you can support me, see [https://emsenn.net/donate](https://emsenn.net/donate).
