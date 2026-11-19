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
