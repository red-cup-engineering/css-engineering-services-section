+++
title = "Emacs Stuff"
author = ["emsenn"]
draft = false
+++

A collection of Elisp.

<style>
  .ox-hugo-toc ul {
    list-style: none;
  }
</style>
<div class="ox-hugo-toc toc">
<div></div>

<div class="heading">Table of Contents</div>

- <span class="section-num">1</span> [Introduction](#introduction)
- <span class="section-num">2</span> [Emacs Stuff](#emacs-stuff)
    - <span class="section-num">2.1</span> [Overview](#overview)
    - <span class="section-num">2.2</span> [Package Management](#package-management)
    - <span class="section-num">2.3</span> [Auto-Update](#auto-update)
    - <span class="section-num">2.4</span> [Client Configuration](#client-configuration)
    - <span class="section-num">2.5</span> [General Client Hooks](#general-client-hooks)
    - <span class="section-num">2.6</span> [Theming](#theming)
        - <span class="section-num">2.6.1</span> [Slow Theming](#slow-theming)
        - <span class="section-num">2.6.2</span> [Poet Theme](#poet-theme)
    - <span class="section-num">2.7</span> [Use-Package Declarations](#use-package-declarations)
        - <span class="section-num">2.7.1</span> [<span class="org-todo todo DRAFT">DRAFT</span> Flyspell](#flyspell)
        - <span class="section-num">2.7.2</span> [HTMLize](#htmlize)
        - <span class="section-num">2.7.3</span> [Magit](#magit)
        - <span class="section-num">2.7.4</span> [<span class="org-todo todo DRAFT">DRAFT</span> Olivetti](#olivetti)
        - <span class="section-num">2.7.5</span> [Org-Bullets](#org-bullets)
        - <span class="section-num">2.7.6</span> [Org](#org)
            - <span class="section-num">2.7.6.1</span> [Use-Package Initialization](#use-package-initialization)
            - <span class="section-num">2.7.6.2</span> [Hotkeys](#hotkeys)
            - <span class="section-num">2.7.6.3</span> [Config Initialization](#config-initialization)
            - <span class="section-num">2.7.6.4</span> [Logging Config](#logging-config)
            - <span class="section-num">2.7.6.5</span> [Inline-Image Config](#inline-image-config)
            - <span class="section-num">2.7.6.6</span> [WYSIWYG Formatting](#wysiwyg-formatting)
            - <span class="section-num">2.7.6.7</span> [Iconography](#iconography)
            - <span class="section-num">2.7.6.8</span> [Fonts](#fonts)
            - <span class="section-num">2.7.6.9</span> [Variable Pitch](#variable-pitch)
            - <span class="section-num">2.7.6.10</span> [Hooks](#hooks)
            - <span class="section-num">2.7.6.11</span> [Agenda Configuration](#agenda-configuration)
            - <span class="section-num">2.7.6.12</span> [Link Abbreviations](#link-abbreviations)
            - <span class="section-num">2.7.6.13</span> [Export Configuration](#export-configuration)
            - <span class="section-num">2.7.6.14</span> [TODO Keywords](#todo-keywords)
            - <span class="section-num">2.7.6.15</span> [Capture Templates](#capture-templates)
            - <span class="section-num">2.7.6.16</span> [Project Definitions](#project-definitions)
            - <span class="section-num">2.7.6.17</span> [Macros](#macros)
                - <span class="section-num">2.7.6.17.1</span> [Dictionary Macros](#dictionary-macros)
                - <span class="section-num">2.7.6.17.2</span> [Document Macros](#document-macros)
                - <span class="section-num">2.7.6.17.3</span> [Brave Old World Macros](#brave-old-world-macros)
                - <span class="section-num">2.7.6.17.4</span> [Legacy Macros](#legacy-macros)
            - <span class="section-num">2.7.6.18</span> [Babel Languages](#babel-languages)
            - <span class="section-num">2.7.6.19</span> [TODO Automatically Clock in When Writing Logs](#todo-automatically-clock-in-when-writing-logs)
            - <span class="section-num">2.7.6.20</span> [Entire Org Use-Package Declaration](#entire-org-use-package-declaration)
        - <span class="section-num">2.7.7</span> [Ox-GFM](#ox-gfm)
        - <span class="section-num">2.7.8</span> [Ox-Org](#ox-org)
        - <span class="section-num">2.7.9</span> [Ox-Hugo](#ox-hugo)
        - <span class="section-num">2.7.10</span> [Pretty-mode](#pretty-mode)
        - <span class="section-num">2.7.11</span> [Toml](#toml)
        - <span class="section-num">2.7.12</span> [Webpaste](#webpaste)
        - <span class="section-num">2.7.13</span> [<span class="org-todo todo DRAFT">DRAFT</span> Writegood-mode](#writegood-mode)
    - <span class="section-num">2.8</span> [My "Packages"](#my-packages)
        - <span class="section-num">2.8.1</span> [Emacs Reading Log](#emacs-reading-log)
            - <span class="section-num">2.8.1.1</span> [Functions](#functions)
                - <span class="section-num">2.8.1.1.1</span> [Read Something](#read-something)
                - <span class="section-num">2.8.1.1.2</span> [Read Something Now](#read-something-now)
                - <span class="section-num">2.8.1.1.3</span> [Plan to Read](#plan-to-read)
                - <span class="section-num">2.8.1.1.4</span> [TODO Read](#todo-read)
            - <span class="section-num">2.8.1.2</span> [Complete Reading Log "Package"](#complete-reading-log-package)
        - <span class="section-num">2.8.2</span> [<span class="org-todo todo DRAFT">DRAFT</span> Fortunes](#fortunes)
            - <span class="section-num">2.8.2.1</span> [Fortunes Data](#fortunes-data)
            - <span class="section-num">2.8.2.2</span> [Fortunes Functions](#fortunes-functions)
            - <span class="section-num">2.8.2.3</span> [Complete Fortunes "Package"](#complete-fortunes-package)
        - <span class="section-num">2.8.3</span> [Brave Old World](#brave-old-world)
            - <span class="section-num">2.8.3.1</span> [Character Templates](#character-templates)
            - <span class="section-num">2.8.3.2</span> [Functions](#functions)
            - <span class="section-num">2.8.3.3</span> [Complete Brave Old World "Package"](#complete-brave-old-world-package)
        - <span class="section-num">2.8.4</span> [Personal Dictionary](#personal-dictionary)
            - <span class="section-num">2.8.4.1</span> [Data](#data)
            - <span class="section-num">2.8.4.2</span> [Functions](#functions)
                - <span class="section-num">2.8.4.2.1</span> [Read Dict Definition](#read-dict-definition)
                - <span class="section-num">2.8.4.2.2</span> [Read Dict Source](#read-dict-source)
                - <span class="section-num">2.8.4.2.3</span> [Read Dict Term](#read-dict-term)
            - <span class="section-num">2.8.4.3</span> [Complete Personal Dictionary "Package"](#complete-personal-dictionary-package)
        - <span class="section-num">2.8.5</span> [Document Plating](#document-plating)
            - <span class="section-num">2.8.5.1</span> [Data](#data)
            - <span class="section-num">2.8.5.2</span> [Functions](#functions)
            - <span class="section-num">2.8.5.3</span> [Complete Document Plating "Package"](#complete-document-plating-package)
    - <span class="section-num">2.9</span> [Functions](#functions)
        - <span class="section-num">2.9.1</span> [Cap First Character](#cap-first-character)
        - <span class="section-num">2.9.2</span> [Build Document ELI](#build-document-eli)
        - <span class="section-num">2.9.3</span> [<span class="org-todo todo DRAFT">DRAFT</span> Open Project Source File](#open-project-source-file)
        - <span class="section-num">2.9.4</span> [Oxfordize List](#oxfordize-list)
        - <span class="section-num">2.9.5</span> [Read Document Type](#read-document-type)
        - <span class="section-num">2.9.6</span> [Slug-Case String](#slug-case-string)
- <span class="section-num">3</span> [Supplements](#supplements)
    - <span class="section-num">3.1</span> [Random Tips](#random-tips)
    - <span class="section-num">3.2</span> [All Elisp Together](#all-elisp-together)

</div>
<!--endtoc-->


## <span class="section-num">1</span> Introduction {#introduction}

This collection of Elisp contains all the stuff I've written to make my life using Emacs easier. Emacs is the text-editor that I do almost all of my computer work through.

This document was written by me, emsenn, in the United States. To the extent possible under law, I have waived all copyright and related or neighboring rights to this collection of Elisp. This collection of Elisp was created for the benefit of the public.


## <span class="section-num">2</span> Emacs Stuff {#emacs-stuff}


### <span class="section-num">2.1</span> Overview {#overview}

I use Emacs as my primary interface for my computer. There's a common joke, "Emacs is a wonderful operating system - and an awful text-editor."

I'm inclined, in many ways, to agree. I have found it a wonderful way of operating a computer system, and incredibly lacklustre as a text-editor. I need to be clear, here, though: the only reason I think Emacs is a _bad_ text-editor is because, due to its easily-extensible nature, it is easy to want to make it better, and better, and better. A default Emacs client is the best text-editor there is - but it's also, really bad.

This file contains the things I've made to make my personal Emacs client, as much as I can, "good."

<span class="timestamp-wrapper"><span class="timestamp">[2019-07-04 Thu]</span></span>
I'm new to learning Emacs, and this collection of configuration is newly-collected from my disparate dabbling in it. There may be typos and non-functional code, and most things are without sufficient explanation.


### <span class="section-num">2.2</span> Package Management {#package-management}

Org-mode comes with its

<a id="code-snippet--package-management-elisp"></a>
```elisp
(package-initialize)
(require 'package)
(add-to-list 'package-archives
	     '("melpa" . "http://melpa.org/packages/") t)
(add-to-list 'package-archives '("org" . "https://orgmode.org/elpa/") t)
(eval-when-compile
  (add-to-list 'load-path "~/.emacs.d/elpa")
  (add-to-list 'load-path "~/.emacs.d/git")
  (require 'use-package))

```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--package-management-elisp">Code Snippet 1</a></span>:
  Elisp declarations setting up the basics of my package managers.
</div>


### <span class="section-num">2.3</span> Auto-Update {#auto-update}

<a id="code-snippet--use-auto-package-update-elisp"></a>
```elisp
(use-package auto-package-update
	     :ensure t
	     :config
	     (setq auto-package-update-delete-old-versions t)
	     (setq auto-package-update-hide-results t)
	     (auto-package-update-maybe))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--use-auto-package-update-elisp">Code Snippet 2</a></span>:
  An Elisp declaration loading and configuring <code>auto-package-update</code> with <code>use-package</code>.
</div>


### <span class="section-num">2.4</span> Client Configuration {#client-configuration}

<a id="code-snippet--client-configuration-elisp"></a>
```elisp
(setq inhibit-startup-message t)
(setq initial-scratch-message nil)
(setq ring-bell-function 'ignore)
(setq show-paren-delay 0)
(show-paren-mode 1)
(setq echo-keystrokes 0.1)
(setq fill-column 68)
(setq mouse-wheel-scroll-amount '(1 ((shift) .1)))
(setq line-number-mode t)
(setq column-number-mode t)
(setq-default truncate-lines t)
(setq-default line-spacing 1)
(setq sentence-end-double-space nil)
(set-face-attribute 'default nil :family "IBM Plex Monospace")
(set-face-attribute 'fixed-pitch nil :family "IBM Plex Monospace")
(set-face-attribute 'variable-pitch nil :family "IBM Plex Serif")
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--client-configuration-elisp">Code Snippet 3</a></span>:
  Elisp declarations for configuring the Emacs client.
</div>


### <span class="section-num">2.5</span> General Client Hooks {#general-client-hooks}

<a id="code-snippet--general-client-hooks-elisp"></a>
```elisp
(add-hook 'before-save-hook 'delete-trailing-whitespace)
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--general-client-hooks-elisp">Code Snippet 4</a></span>:
  Elisp declarations for adding general client hooks to Emacs' configuration.
</div>


### <span class="section-num">2.6</span> Theming {#theming}


#### <span class="section-num">2.6.1</span> Slow Theming {#slow-theming}

It's been a bit since I copy-pasted this from some tutorial or another, but if I remember correctly, this says "don't load any initial theme, wait until one is specified." This keeps Emacs from flickering about a bunch as it starts up.

<a id="code-snippet--slow-theming-elisp"></a>
```elisp
(defadvice load-theme (before theme-dont-propagate activate)
  (mapc #'disable-theme custom-enabled-themes))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--slow-theming-elisp">Code Snippet 5</a></span>:
  An Elisp declaration that I think tells Emacs not to load theming until it's explicitly told to.
</div>


#### <span class="section-num">2.6.2</span> Poet Theme {#poet-theme}

<a id="code-snippet--use-poet-theme-elisp"></a>
```elisp
(use-package poet-theme
	   :ensure t
	   :after org
	   :config
	   (load-theme 'poet-monochrome t))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--use-poet-theme-elisp">Code Snippet 6</a></span>:
  An Elisp declaration loading and configuring <code>poet-theme</code> with <code>use-package</code>.
</div>


### <span class="section-num">2.7</span> Use-Package Declarations {#use-package-declarations}


#### <span class="org-todo todo DRAFT">DRAFT</span> <span class="section-num">2.7.1</span> Flyspell {#flyspell}

This doesn't currently work: it should turn on in Org-mode, but it doesn't.

Regardless, this requires `aspell` and the `en_US` dictionary be installed on your system.

<a id="code-snippet--use-flyspell-elisp"></a>
```elisp
(use-package flyspell
  :ensure t
  :after writegood
  :init
  (progn
    (writegood-mode 1)))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--use-flyspell-elisp">Code Snippet 7</a></span>:
  An Elisp declaration loading and configuring <code>flyspell</code> with <code>use-package</code>.
</div>


#### <span class="section-num">2.7.2</span> HTMLize {#htmlize}

<a id="code-snippet--use-htmlize-elisp"></a>
```elisp
(use-package htmlize
	     :ensure t)
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--use-htmlize-elisp">Code Snippet 8</a></span>:
  An Elisp declaration loading and configuring <code>htmlize</code> with <code>use-package</code>.
</div>


#### <span class="section-num">2.7.3</span> Magit {#magit}

<a id="code-snippet--use-magit-elisp"></a>
```elisp
(use-package magit
	     :ensure t)
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--use-magit-elisp">Code Snippet 9</a></span>:
  An Elisp declaration loading and configuring <code>magit</code> with <code>use-package</code>.
</div>


#### <span class="org-todo todo DRAFT">DRAFT</span> <span class="section-num">2.7.4</span> Olivetti {#olivetti}

**_This has problems:_**

-   <code>[0/2]</code>
    -   [ ] Doesn't actually set a default width of 85
    -   [ ] Should be triggered on elisp mode too.

\#+name use-olivetti-elisp

```elisp
(use-package olivetti
    :ensure olivetti
    :after org
    :config
    (progn
      (setq olivetti-body-width 85)
      (add-hook 'org-mode-hook 'olivetti-mode)))
```

<div class="src-block-caption">
  <span class="src-block-number">Code Snippet 10</span>:
  An Elisp declaration loading and configuring <code>olivetti</code> with <code>use-package</code>.
</div>


#### <span class="section-num">2.7.5</span> Org-Bullets {#org-bullets}

<a id="code-snippet--use-org-bullets-elisp"></a>
```elisp
(use-package org-bullets
  :ensure t
  :after org
  :config
  (add-hook 'org-mode-hook (lambda () (org-bullets-mode 1))))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--use-org-bullets-elisp">Code Snippet 11</a></span>:
  An Elisp declaration loading and configuring <code>org-bullets</code> with <code>use-package</code>.
</div>


#### <span class="section-num">2.7.6</span> Org {#org}

I use Org (hereafter Org-mode) extensively, so its use-package declaration is pretty extensive.


##### <span class="section-num">2.7.6.1</span> Use-Package Initialization {#use-package-initialization}

<a id="code-snippet--use-org-initialization-elisp"></a>
```elisp
(use-package org
  :mode (("\\.org$" . org-mode) ("\\.inc$" . org-mode))
  :ensure org-plus-contrib
```


##### <span class="section-num">2.7.6.2</span> Hotkeys {#hotkeys}

<a id="code-snippet--use-org-hotkeys-elisp"></a>
```elisp
:bind (("C-c l" . org-store-link)
       ("C-c c" . org-capture)
       ("C-c a" . org-agenda)
       ("C-c b" . org-iswitchb)
       ("C-c C-w" . org-refile)
       ("C-c j" . org-clock-goto)
       ("C-c C-x C-o" . org-clock-out))
```


##### <span class="section-num">2.7.6.3</span> Config Initialization {#config-initialization}

<a id="code-snippet--use-org-config-initialization-elisp"></a>
```elisp
:config
(progn
```


##### <span class="section-num">2.7.6.4</span> Logging Config {#logging-config}

<a id="code-snippet--use-org-logging-elisp"></a>
```elisp
(setq org-log-done t)
(setq org-log-into-drawer "LOGBOOK")
```


##### <span class="section-num">2.7.6.5</span> Inline-Image Config {#inline-image-config}

<a id="code-snippet--use-org-images-elisp"></a>
```elisp
(setq org-image-actual-width nil)
```


##### <span class="section-num">2.7.6.6</span> WYSIWYG Formatting {#wysiwyg-formatting}

<a id="code-snippet--use-org-wysiwyg-elisp"></a>
```elisp
(setq org-hide-emphasis-markers t)
```


##### <span class="section-num">2.7.6.7</span> Iconography {#iconography}

<a id="code-snippet--use-org-iconography-elisp"></a>
```elisp
(setq org-ellipsis "→")
```


##### <span class="section-num">2.7.6.8</span> Fonts {#fonts}

<a id="code-snippet--use-org-fonts-elisp"></a>
```elisp
(set-face-attribute 'org-level-1 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-2 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-3 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-4 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-5 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-6 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-7 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-8 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-document-title nil :height 140 :family "IBM Plex Sans")
```


##### <span class="section-num">2.7.6.9</span> Variable Pitch {#variable-pitch}

<a id="code-snippet--use-org-variable-pitch-elisp"></a>
```elisp
;;  (add-hook 'text-mode-hook
;;            (lambda ()
;;              (variable-pitch-mode 1)))
```


##### <span class="section-num">2.7.6.10</span> Hooks {#hooks}

<a id="code-snippet--use-org-hooks-elisp"></a>
```elisp
(add-hook 'org-mode-hook
'visual-line-mode)
```


##### <span class="section-num">2.7.6.11</span> Agenda Configuration {#agenda-configuration}

<a id="code-snippet--use-org-agenda-elisp"></a>
```elisp
(setq org-agenda-custom-commands
      '(("A" "Agenda and TODO"
	 ((agenda "" )
	  (alltodo "" )))))
(setq org-agenda-todo-ignore-scheduled 'all)
(setq org-agenda-files '("~/org/personal/src/index.org"))
```


##### <span class="section-num">2.7.6.12</span> Link Abbreviations {#link-abbreviations}

<a id="code-snippet--use-org-link-elisp"></a>
```elisp

(setq org-link-abbrev-alist '(
			      ("ems-domestic-manual" . "file:~/org/src/domestic-manual.org::#%s")))
```


##### <span class="section-num">2.7.6.13</span> Export Configuration {#export-configuration}

<a id="code-snippet--use-org-export-elisp"></a>
```elisp
(setq org-export-allow-bind-keywords t)
(setq org-export-with-sub-superscripts nil)
(setq org-export-with-special-strings nil)
(setq org-export-with-smart-quotes nil)
(setq org-export-with-section-numbers nil)
(setq org-export-with-toc nil)
(setq org-export-with-todo-keywords nil)
(setq org-export-headline-levels 10)
(setq org-html-style-default nil)
```


##### <span class="section-num">2.7.6.14</span> TODO Keywords {#todo-keywords}

<a id="code-snippet--use-org-todo-elisp"></a>
```elisp

(setq org-todo-keywords
'((sequence "DRAFT" "EDIT" "|" "DONE")
  (sequence "|" "CANCELED")))
```


##### <span class="section-num">2.7.6.15</span> Capture Templates {#capture-templates}

<a id="code-snippet--use-org-capture-templates-elisp"></a>
```elisp

(setq org-capture-templates
      '(("s" "New Source File" plain (file "~/org/triage/source-capture.org")
	 "#+SETUPFILE: ~/org/templates/setupfile0.org\n#+TITLE: %^{TITLE}\n#+EXPORT_FILE_NAME: ../pub/%^{SLUG}\n* Introduction\n%?\n#+INCLUDE: \"./eli.org::#draft\"\n#+INCLUDE: \"./eli.org::#eli\"\n* %\\1\n  :PROPERTIES:\n  :CUSTOM_ID: contents\n  :END:\n* Supplements\n#+INCLUDE: \"./mit-license.org::#license\"")
	("l" "New Log Entry" entry (file+olp+datetime "~/org/personal.org" ["Logs"])
	 ""
	 )
	("a" "Activity" item (file+datetree "~/org/projects/personal-data/activities.org")
	 "%U :: %?")
	("b" "Bibliography" entry (file+olp "~/org/projects/emacs-configuration/source.org" "Emacs Configuration" "Packages" "Org-mode" "Macros" "Bibliography Macros")
	 "* %^{TITLE}\n#+begin_src elisp\n(\"%^{SLUG}-title\" . \"%\\1\")\n(\"%\\2-author\" . \"%^{AUTHOR}\")\n(\"%\\2-source\" . \"%^{SOURCE}\")\n(\"%\\2-opinion\" . \"%^{OPINION}\")\n#+end_src")))
```


##### <span class="section-num">2.7.6.16</span> Project Definitions {#project-definitions}

<a id="code-snippet--use-org-projects-elisp"></a>
```elisp

(setq org-publish-project-alist
      '(
	("state-of-iranian-communication"
	 :base-directory "~/org/projects/state-of-iranian-communication/src/"
	 :base-extension "org"
	 :publishing-directory "~/org/projects/state-of-iranian-communication/"
	 :publishing-function (org-html-publish-to-html org-latex-export-to-pdf org-org-export-to-org)
	 )
	("personal-dictionary"
	 :base-directory "~/org/projects/personal-dictionary/"
	 :base-extension ""
	 :include "source.org"
	 :makeindex t
	 :publishing-directory "~/org/projects/personal-dictionary/"
	 :publishing-function (org-html-publish-to-html)
	 )
	("30-days-of-world-building-summer-2019"
	 :base-directory "~/org/projects/30-days-of-world-building-summer-2019/src/"
	 :base-extension "org"
	 :publishing-directory "~/org/projects/30-days-of-world-building-summer-2019/"
	 :publishing-function org-html-publish-to-html)
	("public-html"
	 :base-directory "~/"
	 :base-extension "org"
	 :recursive t
	 :exclude "pr.org"
	 :makeindex t
	 :auto-sitemap t
	 :publishing-directory "~/public-html/"
	 :publishing-function (org-html-publish-to-html))))
```


##### <span class="section-num">2.7.6.17</span> Macros {#macros}

<a id="code-snippet--use-org-macros-elisp"></a>
```elisp
(setq org-export-global-macros
      '(
```


###### <span class="section-num">2.7.6.17.1</span> Dictionary Macros {#dictionary-macros}

<a id="code-snippet--use-org-dictionary-macros-elisp"></a>
```elisp
("source" .
 "(eval (concat \"See [[\"(ems-read-dict-source \"\$1\") \"]].\"))")
("define" .
 "(eval (ems-read-dict-definition \$1))")
("Define" .
 "(eval (ems-cap-first-char (ems-read-dict-definition \$1)))")
("ref" .
 "{{{Define(\$1)}}} {{{source(\$1)}}}")
```


###### <span class="section-num">2.7.6.17.2</span> Document Macros {#document-macros}

<a id="code-snippet--use-org-document-macros-elisp"></a>
```elisp
("document-type" .
 "document")
("doc" .
 "{{{document-type}}}")
("document-eli" .
 "(eval (ems-build-document-eli \$1))")
```


###### <span class="section-num">2.7.6.17.3</span> Brave Old World Macros {#brave-old-world-macros}

<a id="code-snippet--use-org-brave-old-world-macros"></a>
```elisp
("bow-character-template" .
 "(eval (ems-bow-build-character-template \$1))")
("bow-adventure-brief" . "*/{{{title}}}/* is a /tabletop role-playing *{{{doc}}}*/ in which {{{property(adventure-inwhich)}}}, usually taking between {{{property(adventure-length)}}} to complete.")))
```


###### <span class="section-num">2.7.6.17.4</span> Legacy Macros {#legacy-macros}

```elisp
("ref" . "{{{define(\$1)}}} {{{source(\$1)}}}")
	("define" . "{{{\$1-definition}}}")
	("contact" . "{{{\$1-contact}}}")
	("read" . "Read \"{{{\$1-title}}},\" by {{{\$1-author}}}. {{{source(\$1)}}} {{{\$1-opinion}}}")
	("source-link" . "See [[\$1][\$1]]")
	("hashtag-link" . " or #\$1")

("document-eli-default" . "This {{{document-type}}} was created by me, emsenn, in the United States. To the extent possible under law, I have waived all copyright and related or neighboring rights to this document. This document was created for the benefit of the public. If you're viewing it on a remote server, you're encouraged to download your own copy. To learn how you can support me, see [[https://emsenn.net/donate][https://emsenn.net/donate]].")
("document-eli-default-with-elisp" . "This {{{document-type}}} was created by me, emsenn, in the United States. With the exception of /Emacs Lisp/ code contained within, to the extent possible under law, I have waived all copyright and related or neighboring rights to this {{{document-type}}}. This {{{document-type}}} was created for the benefit of the public. Sections of this {{{document-type}}} written in /Emacs Lisp/ (\"these sections\") are free software: you can redistribute them freely and/or modify them under the terms of version 3 of the /GNU General Public License/ as published by the /Free Software Foundation/. These sections are distributed in the hope that they will be useful, but *without any warranty*; without even the implied warranty of *merchantability* or *fitness for a particular purpose*. See the /GNU General Public License/ for more details. You should have received a copy of the /GNU General Public License/ with this {{{document-type}}} under the [[#gnu-gpl][\"GNU General Public License\"]] section under the [[#supplements][\"Supplements\"]] section. If not, see [[http://www.gnu.org/licenses/][http://www.gnu.org/licenses/]].")
("document-is-draft" . "This {{{document-type}}} is a /draft/: it is unfinished and that should be considered when reading it. Special attention should be paid to text marked DRAFT, EDIT, or TK.")
("document-has-project" . "This {{{document-type}}} is part of a larger project, {{{project-name}}}. {{{project-logline}}} {{{project-brief}}} For more information, see {{{project-homepage}}}")
("document-brief" . "\"{{{title}}}\" is a {{{document-type}}} created by {{{author}}}.")
("document-implements-literate-programming" . "This {{{document-type}}} implements its content using the /literate programming/ paradigm. The \"software\" being presented is included as sections of code, within a longer piece of prose which explains the codes' purpose and usage. {{{source(literate-programming)}}}")
("document-is-software-prototype" . "This {{{document-type}}} is about a software prototype. It is likely to be inaccurate.")
("document-is-prototype" . "This {{{document-type}}} is about a prototype \$1. It is likely to be incomplete, self-contradicting, and flawed.")
("document-can-tangle" . "This /Org-mode/ source file contains code which can be extracted. See [[https://orgmode.org/manual/Working-with-source-code.html][https://orgmode.org/manual/Working-with-source-code.html]].")

("project-brief" . "{{{project-name}}} is a {{{project-type}}} in {{{project-development-stage}}} being created by {{{project-author}}}.")
("project-eli" . "This {{{project-type}}} is maintained by {{{author}}} and is released for the benefit of the public under the terms in the {{{project-license-link(\"Project License\" section)}}}. It was made possible with {{{project-support-link(support)}}} from humans like you. Thank you. Please direct comments to the {{{author}}} through their {{{project-public-inbox}}} or, if appropriate, their {{{project-private-inbox}}}.")

("activitypub-definition" . "A decentralized communication protocol for uploading, broadcasting, and subscribing to content.")
("activitypub-source" . "See {{{source-link(https://activitypub.rocks/)}}} or #ActivityPub.")
("bitbucket-definition" . "\$1")
("bitbucket-source" . "\$1")
("broadcast-definition" . "To send a piece of information to /subscribers/ or into a public area.")
("broadcast-source" . "\$1")
("brutalism-definition" . "A style exaggerating the pragmatic functionality present in modernist design.")
("brutalism-source" . "{{{source-link(https://en.wikipedia.org/wiki/Brutalist_architecture)}}}")
("brutstrap-css-definition" . "\$1")
("brutstrap-css-source" . "\$1")
("bryant-stephanie-definition" . "Creator of the /30 Days of World Building/ challenge, and an Agile and SCRUM coach.")
("bryant-stephanie-source" . "{{{source-link(http://www.mortaine.com/)}}}")
("dictionary-definition" . "A pairing of keys to the values that define them.")
("css-definition" . "\$1")
("css-source" . "\$1")
("domain-name-definition" . "A string (group of letters) defining the name of an area of the Internet.")
("domain-name-source" . "See {{{source-link(https://en.wikipedia.org/wiki/Domain_name)}}}.")
("elisp-definition" . "A dialect of the /Lisp/ programming language used by /Emacs/.")
("elisp-source" . "{{{source-link(https://en.wikipedia.org/wiki/Emacs_Lisp)}}}")
("emacs-definition" . "A software, a programming interpretter focused around being a text-editor.")
("emacs-source" . "{{{source-link(https://www.gnu.org/software/emacs/)}}} or #Emacs.")
("emacs-buffer-definition" . "An /Emacs/ object for holding a quantity of text.")
("emacs-buffer-source" . "{{{source-link(https://www.gnu.org/software/emacs/manual/html_node/emacs/Buffers.html)}}}")
("emacs-configuration-personal-definition" . "Not available.")
("emacs-configuration-personal-source" . "\$1")
("emacs-package-definition" . "A collection of /Emacs Lisp/ declarations that add additional features.")
("emacs-package-source" . "{{{source-link(https://www.gnu.org/software/emacs/manual/html_node/emacs/Packages.html)}}}")
("email-definition" . "A collection of protocols for exchanging text messages between clients on servers.")
("email-source" . "See {{{source-link(https://en.wikipedia.org/wiki/Email)}}}.")
("email-list-definition" . "\$1")
("email-list-source" . "\$1")
("emsenn-definition" . "A writer and developer focused on how words affect our thinking.")
("emsenn-source" . "{{{source-link(https://emsenn.net/)}}}")
("emsenn-contact" . "Send an email to [[mailto:emsenn@emsenn.net][emsenn.net]].")
("emsenn-net-definition" . "A web service where I broadcast my writing.")
("emsenn-net-source" . "See {{{source-link(https://emsenn.net)}}}.")
("fediverse-definition" . "The conglomeration of federated communication platforms, or its culture.")
("fediverse-source" . "See {{{source-link(https://en.wikipedia.org/wiki/Fediverse)}}} or #Fediverse.")
("gfm-definition" . "A specialization of the /Markdown/ formatting for styling text documents.")
("gfm-source" . "See {{{source-link(https://github.github.com/gfm/)}}}.")
("git-definition" . "A software tool for tracking and coordinating changes in computer files.")
("git-source" . "{{{source-link(https://git-scm.com/)}}}{{{hashtag-link(Git)}}}.")
("git-forge-definition" . "A web service providing an interface to and extending a /Git/ repository.")
("git-forge-source" . "\$1")
("git-repository-definition" . "\$1")
("git-repository-source" . "\$1")
("git-submodule-definition" . "\$1")
("git-submodule-source" . "\$1")
("github-definition" . "\$1")
("github-source" . "\$1")
("gitlab-definition" . "\$1")
("gitlab-source" . "\$1")
("golang-definition" . "A computer programming language.")
("golang-source" . "See {{{source-link(https://golang.org)}}}.")
("guix-definition" . "A software tool for managing a computer system's software packages.")
("guix-source" . "{{{source-link(https://www.gnu.org/software/guix/)}}}.")
("html-definition" . "A way of adding layout, formatting, and media to text documents.")
("html-source" . "{{{source-link(https://en.wikipedia.org/wiki/HTML)}}}.")
("hugo-definition" . "A software tool for creating rendered documents from formatted text files.")
("hugo-source" . "{{{source-link(https://gohugo.io/)}}}")
("hugo-config-source" . "{{{source-link(https://gohugo.io/getting-started/configuration/)}}}")
("hugo-configuration-definition" . "\$1")
("hugo-configuration-source" . "\$1")
("hugo-content-type-definition" . "The classification of a piece based on what form of media it is.")
("hugo-content-type-source" . "{{{source-link(https://gohugo.io/content-management/types/)}}}")
("hugo-front-matter-definition" . "A collection of data associated with a content piece.")
("hugo-front-matter-source" . "{{{source-link(https://gohugo.io/content-management/front-matter/)}}}.")
("hugo-templates-definition" . "The framework which determines what is in a rendered document and how it appears.")
("hugo-templates-source" . "{{{source-link(https://gohugo.io/templates/lookup-order/)}}}")
("hugo-lookup-order-definition" . "The order in which /Hugo/ looks up which layout(s) to apply to a page.")
("hugo-lookup-order-source" . "{{{source-link(https://gohugo.io/templates/lookup-order/#readout)}}}.")
("hugo-partial-templates-definition" . "\$1")
("hugo-partial-templates-source" . "{{{source-link(https://gohugo.io/templates/partials/)}}}")
("hugo-themes-definition" . "Collections of layouts for use by the /Hugo/ static site generator.")
("hugo-themes-source" . "https://gohugo.io/themes/")
("hugo-media-package-channel-theme-definition" . "A /Hugo theme/ for creating a media package channel.")
("hugo-media-package-channel-theme-source" . "\$1")
("indieweb-definition" . "A set of data specifications and software utilities for coordinating the serialization of social data.")
("indieweb-source" . "{{{source-link(https://indieweb.org/)}}}.")
("javascript-definition" . "An interpretted programming language used frequently in Web development.")
("javascript-source" . "{{{source-link(https://en.wikipedia.org/wiki/JavaScript)}}}.")
("json-definition" . "A human-readable data format.")
("json-source" . "{{{source-link(https://json.org/)}}}.")
("lisp-definition" . "A family of computer programming languages influenced by lambda calculus.")
("lisp-source" . "{{{source-link(https://en.wikipedia.org/wiki/Lisp_(programming_language))}}}")
("literate-programming-definition" . "A programming paradigm in which information is presented in natural language with traditional source code implemented as figures within that text.")
("literate-programming-source" . "{{{source-link(https://en.wikipedia.org/wiki/Literate_programming)}}}")
("markdown-definition" . "A way of adding style notation to plain text.")
("markdown-source" . "https://daringfireball.net/projects/markdown/")
("mastodon-definition" . "A platform for broadcasting and receiving short text messages between users on different servers and viewing aggregate feeds of servers or tagged posts.")
("mastodon-source" . "See {{{source-link(https://joinmastodon.org/)}}} {{{tag-link(Mastodon)}}}")
("media-package-definition" . "A manifest of metadata about a piece of media content.")
("media-package-source" . "\$1")
("media-package-channel-definition" . "A listing of /media packages/.")
("media-package-channel-source" . "\$1")
("media-package-channel-generator-definition" . "A software that turns /media packages/ into a /media package channel/.")
("media-package-channel-generator-source" . "\$1")
("microsoft-definition" . "\$1")
("microsoft-source" . "\$1")
("microblog-definition" . "\$1")
("microblog-source" . "\$1")
("microblog-federated-definition" . "\$1")
("microblog-federated-source" . "\$1")
("netlify-definition" . "\$1")
("netlify-source" . "\$1")
("org-mode-definition" . "A way of formatting plain data inside text documents.")
("org-mode-source" . "{{{source-link(https://orgmode.org/)}}} {{{hashtag-link(OrgMode)}}}.")
("org-mode-babel-definition" . "A software tool for using code integrated into /Org-mode/ documents.")
("org-mode-babel-source" . "{{{source-link(https://orgmode.org/worg/org-contrib/babel/intro.html)}}}")
("org-mode-babel-tangle-definition" . "\$1")
("org-mode-babel-tangle-source" . "\$1")
("org-mode-macros-definition" . "A way to replace text in a source document when it is exported to a rendered document.")
("org-mode-macros-source" . "{{{source-link(https://orgmode.org/manual/Macro-replacement.html)}}}")
("org-mode-refile-definition" . "A way to move text from one part a document to another, or into another document entirely.")
("org-mode-refile-source" . "{{{source-link(https://orgmode.org/manual/Refile-and-Copy.html#Refile-and-Copy)}}}")
("ox-gfm-definition" . "A software tool for exporting /Org-mode/ files to /Github-Flavored Markdown/.")
("ox-gfm-source" . "See {{{source-link(https://github.com/larstvei/ox-gfm)}}}.")
("ox-hugo-definition" . "A software tool for exporting /Org-mode/ files to /Hugo/-compatible /Markdown/.")
("ox-hugo-source" . "{{{source-link(https://ox-hugo.scripter.co/)}}}.")
("plate-tectonics-definition" . "A theory describing the movement of rock segments under a plates surface leading to the formation of geographic features.")
("plate-tectonics-source" . "{{{source-link(https://en.wikipedia.org/wiki/Plate_tectonics)}}}.")
("programming-functional-definition" . "A style of writing computer programs as a composition of mathematical functions.")
("programming-functional-source" . "{{{source-link(https://en.wikipedia.org/wiki/Functional_programming)}}}")
("programming-object-oriented-definition" . "A style of writing computer programs as objects who changes through interaction.")
("programming-object-oriented-source" . "{{{source-link(https://en.wikipedia.org/wiki/Object-oriented_programming)}}}")
("python-definition" . "An interpreted dynamically typed and garbage collected computer programming language.")
("python-source" . "{{{source-link(https://en.wikipedia.org/wiki/Python_(programming_language))}}}")
("rss-definition" . "A file format for sharing a feed of a website's content; usually recently added pages.")
("rss-source" . "See {{{source-link(https://en.wikipedia.org/wiki/RSS)}}}.")
("software-stack-definition" . "\$1")
("software-stack-source" . "\$1")
("sourcehut-definition" . "\$1")
("sourcehut-source" . "\$1")
("subscribe-definition" . "To choose to receive communication from a source.")
("subscribe-source" . "\$1")
("teraum-definition" . "A tragically funny fantasy setting.")
("teraum-source" . "See {{{source-link(https://emsenn.net/teraum/)}}} {{{hashtag-link(Teraum)}}}.")
("teraum-arathel-definition" . "A sleepy, worn-down town.")
("teraum-arathel-source" . "\$1")
("teraum-arathel-county-definition" . "A swampy and sandy county.")
("teraum-arathel-county-source" . "\$1")
("teraum-central-plains-definition" . "A large agricultural region, full of towns and castles.")
("teraum-central-plains-source" . "\$1")
("teraum-falling-coast-definition" . "A massive cliff dividing a vast desert from the rest of the world.")
("teraum-falling-coast-source" . "\$1")
("teraum-green-delta-definition" . "A hospitable and well-settled region of the world.")
("teraum-green-delta-source" . "\$1")
("teraum-green-river-definition" . "A slow wide river, cutting through the world.")
("teraum-green-river-source" . "\$1")
("teraum-kaiper-river-definition" . "A silty excuse for a river.")
("teraum-kaiper-river-source" . "\$1")
("teraum-old-world-definition" . "The large continent where most of history happened.")
("teraum-old-world-source" . "\$1")
("teraum-optic-ocean-definition" . "A large desert separating one part of the world from the other.")
("teraum-optic-ocean-source" . "\$1")
("teraum-unseen-sea-definition" . "A desert so large it was first mistaken for a seabed.")
("teraum-unseen-sea-source" . "\$1")
("teraum-worldkeepers-definition" . "A range of large mountains.")
("teraum-worldkeepers-source" . "\$1")
("teraum-worldkeep-definition" . "A vast complex housing an unbelievable variety of magic lifeforms.")
("teraum-worldkeep-source" . "\$1")
("thirty-days-of-world-building-definition" . "A series of prompts for building a fictional world.")
("thirty-days-of-world-building-source" . "See {{{source-link(http://www.web-writer.net/fantasy/days/)}}} or #30DaysOfWorldBuilding.")
("toml-definition" . "A human-readable data format.")
("toml-source" . "{{{source-link(https://github.com/toml-lang/toml)}}}.")
("use-package-definition" . "An /Emacs/ macro for isolating package configurations.")
("use-package-source" . "{{{source-link(https://github.com/jwiegley/use-package)}}}")
("web-browser-definition" . "A software tool for viewing and interacting with information on remote servers, usually rich documents.")
("web-browser-source" . "{{{source-link(https://en.wikipedia.org/wiki/Web_browser)}}}")
("website-dynamic-definition" . "\$1")
("website-dynamic-source" . "\$1")
("website-personal-definition" . "\$1")
("website-personal-source" . "\$1")
("website-static-definition" . "\$1")
("website-static-source" . "\$1")
("write-as-definition" . "A web service providing /WriteFreely/ hosting.")
("write-as-source" . "See {{{source-link(https://write.as/)}}} or #WriteAs")
("writefreely-el-definition" . "A script for uploading /Org-mode/ text to a /WriteFreely/ instance.")
("writefreely-el-source" . "See {{{source-link(https://github.com/dangom/writefreely.el)}}}.")
("writefreely-definition" . "A software service for broadcasting long text documents.")
("writefreely-source" . "See {{{source-link(https://writefreely.org/)}}} or #WriteFreely.")

("shaggy-dog-tale-title" . "A Shaggy Dog Tale")
("shaggy-dog-tale-author" . "emsenn")
("shaggy-dog-tale-source" . "{{{source-link(unavailable)}}}")
("shaggy-dog-tale-opinion" . "A well-written story that doesn't go anywhere.")

)
```


##### <span class="section-num">2.7.6.18</span> Babel Languages {#babel-languages}

<a id="code-snippet--use-org-babel-elisp"></a>
```elisp
(org-babel-do-load-languages
 'org-babel-load-languages
 '((crystal . t)
   (ledger . t)
   (shell . t)))))
```


##### <span class="section-num">2.7.6.19</span> TODO Automatically Clock in When Writing Logs {#todo-automatically-clock-in-when-writing-logs}


##### <span class="section-num">2.7.6.20</span> Entire Org Use-Package Declaration {#entire-org-use-package-declaration}

<a id="code-snippet--use-org-elisp"></a>
```elisp
(use-package org
  :mode (("\\.org$" . org-mode) ("\\.inc$" . org-mode))
  :ensure org-plus-contrib
:bind (("C-c l" . org-store-link)
       ("C-c c" . org-capture)
       ("C-c a" . org-agenda)
       ("C-c b" . org-iswitchb)
       ("C-c C-w" . org-refile)
       ("C-c j" . org-clock-goto)
       ("C-c C-x C-o" . org-clock-out))
:config
(progn
(setq org-log-done t)
(setq org-log-into-drawer "LOGBOOK")
(setq org-image-actual-width nil)
(setq org-hide-emphasis-markers t)
(setq org-ellipsis "→")
(set-face-attribute 'org-level-1 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-2 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-3 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-4 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-5 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-6 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-7 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-8 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-document-title nil :height 140 :family "IBM Plex Sans")

(add-hook 'org-mode-hook
'visual-line-mode)
(setq org-agenda-custom-commands
      '(("A" "Agenda and TODO"
	 ((agenda "" )
	  (alltodo "" )))))
(setq org-agenda-todo-ignore-scheduled 'all)
(setq org-agenda-files '("~/org/personal/src/index.org"))

(setq org-link-abbrev-alist '(
			      ("ems-domestic-manual" . "file:~/org/src/domestic-manual.org::#%s")))
(setq org-export-allow-bind-keywords t)
(setq org-export-with-sub-superscripts nil)
(setq org-export-with-special-strings nil)
(setq org-export-with-smart-quotes nil)
(setq org-export-with-section-numbers nil)
(setq org-export-with-toc nil)
(setq org-export-with-todo-keywords nil)
(setq org-export-headline-levels 10)
(setq org-html-style-default nil)

(setq org-todo-keywords
'((sequence "DRAFT" "EDIT" "|" "DONE")
  (sequence "|" "CANCELED")))

(setq org-capture-templates
      '(("s" "New Source File" plain (file "~/org/triage/source-capture.org")
	 "#+SETUPFILE: ~/org/templates/setupfile0.org\n#+TITLE: %^{TITLE}\n#+EXPORT_FILE_NAME: ../pub/%^{SLUG}\n* Introduction\n%?\n#+INCLUDE: \"./eli.org::#draft\"\n#+INCLUDE: \"./eli.org::#eli\"\n* %\\1\n  :PROPERTIES:\n  :CUSTOM_ID: contents\n  :END:\n* Supplements\n#+INCLUDE: \"./mit-license.org::#license\"")
	("l" "New Log Entry" entry (file+olp+datetime "~/org/personal.org" ["Logs"])
	 ""
	 )
	("a" "Activity" item (file+datetree "~/org/projects/personal-data/activities.org")
	 "%U :: %?")
	("b" "Bibliography" entry (file+olp "~/org/projects/emacs-configuration/source.org" "Emacs Configuration" "Packages" "Org-mode" "Macros" "Bibliography Macros")
	 "* %^{TITLE}\n#+begin_src elisp\n(\"%^{SLUG}-title\" . \"%\\1\")\n(\"%\\2-author\" . \"%^{AUTHOR}\")\n(\"%\\2-source\" . \"%^{SOURCE}\")\n(\"%\\2-opinion\" . \"%^{OPINION}\")\n#+end_src")))

(setq org-publish-project-alist
      '(
	("state-of-iranian-communication"
	 :base-directory "~/org/projects/state-of-iranian-communication/src/"
	 :base-extension "org"
	 :publishing-directory "~/org/projects/state-of-iranian-communication/"
	 :publishing-function (org-html-publish-to-html org-latex-export-to-pdf org-org-export-to-org)
	 )
	("personal-dictionary"
	 :base-directory "~/org/projects/personal-dictionary/"
	 :base-extension ""
	 :include "source.org"
	 :makeindex t
	 :publishing-directory "~/org/projects/personal-dictionary/"
	 :publishing-function (org-html-publish-to-html)
	 )
	("30-days-of-world-building-summer-2019"
	 :base-directory "~/org/projects/30-days-of-world-building-summer-2019/src/"
	 :base-extension "org"
	 :publishing-directory "~/org/projects/30-days-of-world-building-summer-2019/"
	 :publishing-function org-html-publish-to-html)
	("public-html"
	 :base-directory "~/"
	 :base-extension "org"
	 :recursive t
	 :exclude "pr.org"
	 :makeindex t
	 :auto-sitemap t
	 :publishing-directory "~/public-html/"
	 :publishing-function (org-html-publish-to-html))))
(setq org-export-global-macros
      '(
("source" .
 "(eval (concat \"See [[\"(ems-read-dict-source \"\$1\") \"]].\"))")
("define" .
 "(eval (ems-read-dict-definition \$1))")
("Define" .
 "(eval (ems-cap-first-char (ems-read-dict-definition \$1)))")
("ref" .
 "{{{Define(\$1)}}} {{{source(\$1)}}}")
("document-type" .
 "document")
("doc" .
 "{{{document-type}}}")
("document-eli" .
 "(eval (ems-build-document-eli \$1))")
("bow-character-template" .
 "(eval (ems-bow-build-character-template \$1))")
("bow-adventure-brief" . "*/{{{title}}}/* is a /tabletop role-playing *{{{doc}}}*/ in which {{{property(adventure-inwhich)}}}, usually taking between {{{property(adventure-length)}}} to complete.")))
(org-babel-do-load-languages
 'org-babel-load-languages
 '((crystal . t)
   (ledger . t)
   (shell . t)))))
```


#### <span class="section-num">2.7.7</span> Ox-GFM {#ox-gfm}

<a id="code-snippet--use-ox-gfm-elisp"></a>
```elisp
(use-package ox-gfm
  :after org
  :ensure t)
```


#### <span class="section-num">2.7.8</span> Ox-Org {#ox-org}

```elisp
(use-package ox-org
  :after org
  :ensure t)
```


#### <span class="section-num">2.7.9</span> Ox-Hugo {#ox-hugo}

<a id="code-snippet--use-ox-hugo-elisp"></a>
```elisp
(use-package ox-hugo
  :after org
  :ensure t)
```


#### <span class="section-num">2.7.10</span> Pretty-mode {#pretty-mode}

<a id="code-snippet--use-pretty-mode-elisp"></a>
```elisp
(use-package pretty-mode
  :ensure pretty-mode
  :config
  (progn
    (global-pretty-mode t)
    (global-prettify-symbols-mode 1)
    (pretty-deactivate-groups
     '(:equality :ordering :order-double :ordering-triple :arrows
		 :arrows-twoheaded :punctuation :logic :sets))
    (pretty-activate-groups
     '(:sub-and-superscripts :greek :arithmetic-nary))))

```


#### <span class="section-num">2.7.11</span> Toml {#toml}

```elisp
(use-package toml-mode
  :ensure t)
```


#### <span class="section-num">2.7.12</span> Webpaste {#webpaste}

<a id="code-snippet--use-webpaste-elisp"></a>
```elisp
(use-package webpaste
  :ensure t
  :bind (("C-c C-p C-b" . webpaste-paste-buffer)
	 ("C-c C-p C-r" . webpaste-paste-region))
  :config
  (progn
    (setq webpaste-provider-priority '("ptpb.pw"))))
```


#### <span class="org-todo todo DRAFT">DRAFT</span> <span class="section-num">2.7.13</span> Writegood-mode {#writegood-mode}

<a id="code-snippet--use-writegood-elisp"></a>
```elisp
(use-package writegood-mode
  :ensure t
  :bind (("\C-c\C-gg" . writegood-grade-level)
	 ("\C-c\C-ge" . writegood-reading-ease))
  :init
  (progn
    (writegood-mode 1))
  :config
  (progn
    (setq ispell-program-name "aspell")
    (setq ispell-list-command "--list") ;; run flyspell with aspell, not ispell
  ))
```


### <span class="section-num">2.8</span> My "Packages" {#my-packages}


#### <span class="section-num">2.8.1</span> Emacs Reading Log {#emacs-reading-log}


##### <span class="section-num">2.8.1.1</span> Functions {#functions}


###### <span class="section-num">2.8.1.1.1</span> Read Something {#read-something}

<a id="code-snippet--ems-read-something-elisp"></a>
```elisp
(defun ems-read-something
    ()
  "Return a random element's cdr, which should be a string that is a URL, from the ems-reading-list variable."
  (cdr (assoc 'source (cdr (seq-random-elt (cdr (assoc 'pending ems-reading-log)))))))
```


###### <span class="section-num">2.8.1.1.2</span> Read Something Now {#read-something-now}

<a id="code-snippet--ems-read-something-now-elisp"></a>
```elisp
(defun ems-read-something-now ()
  "Opens a random item from the pending reading list."
  (interactive) (browse-url (ems-read-something)))
```


###### <span class="section-num">2.8.1.1.3</span> Plan to Read {#plan-to-read}

<a id="code-snippet--ems-plan-to-read-elisp"></a>
```elisp
(defun ems-plan-to-read
    (tit auth src)
  "Adds an item to my reading list"
  (interactive "sTitle? \nsAuthor? \nsSource? ")
  (push
   (cons tit (cons (cons 'author auth) (list (cons 'source src))))
   (cdr (assoc 'pending ems-reading-log))))
```


###### <span class="section-num">2.8.1.1.4</span> TODO Read {#todo-read}

Mark a pending item, referred to be title, as read

```elisp
(defun ems-read (title)
"Moves TITLE from the pending reading log to the read reading log. I hate the word 'read'."
)
```


##### <span class="section-num">2.8.1.2</span> Complete Reading Log "Package" {#complete-reading-log-package}

<a id="code-snippet--ems-reading-log-elisp"></a>
```elisp
(defun ems-read-something
    ()
  "Return a random element's cdr, which should be a string that is a URL, from the ems-reading-list variable."
  (cdr (assoc 'source (cdr (seq-random-elt (cdr (assoc 'pending ems-reading-log)))))))
(defun ems-read-something-now ()
  "Opens a random item from the pending reading list."
  (interactive) (browse-url (ems-read-something)))
(defun ems-plan-to-read
    (tit auth src)
  "Adds an item to my reading list"
  (interactive "sTitle? \nsAuthor? \nsSource? ")
  (push
   (cons tit (cons (cons 'author auth) (list (cons 'source src))))
   (cdr (assoc 'pending ems-reading-log))))
```


#### <span class="org-todo todo DRAFT">DRAFT</span> <span class="section-num">2.8.2</span> Fortunes {#fortunes}

I don't know the origin offhand but there are "fortune files," which are quotes and other snippets of text that are used by people as random login messages or email signatures. I'd like to start cataloging my own fortunes. I used to have a fair number that served as the splash text for a MUD I was making.

Searching online, there's a frontend for the software `fortune`, for Emacs: <https://www.emacswiki.org/emacs/Fortune>

But according to my package manager, that program is nearly four megabytes! Seems a lot for "store strings and give them back."

Here's a pair of declarations to get me what I need of the same thing.


##### <span class="section-num">2.8.2.1</span> Fortunes Data {#fortunes-data}

<a id="code-snippet--ems-fortunes-data-elisp"></a>
```elisp
(setq ems-fortunes
'("Rome wasn't built in a day and you shouldn't aspire for your mind to be any less."
"Our society is not sustained by mortar and stone."))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--ems-fortunes-data-elisp">Code Snippet 12</a></span>:
  An Elisp declaration defining the <code>ems-fortunes</code> variable.
</div>


##### <span class="section-num">2.8.2.2</span> Fortunes Functions {#fortunes-functions}

<a id="code-snippet--ems-insert-fortune-elisp"></a>
```elisp
(defun ems-insert-fortune ()
"Inserts a random fortune at point in the current buffer."
(interactive)
 (insert (seq-random-elt ems-fortunes)))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--ems-insert-fortune-elisp">Code Snippet 13</a></span>:
  An Elisp declaration defining the <code>ems-insert-fortune</code> function, which inserts a random fortune at point in the current buffer.
</div>


##### <span class="section-num">2.8.2.3</span> Complete Fortunes "Package" {#complete-fortunes-package}

<a id="code-snippet--ems-fortunes-elisp"></a>
```elisp
(setq ems-fortunes
'("Rome wasn't built in a day and you shouldn't aspire for your mind to be any less."
"Our society is not sustained by mortar and stone."))
(defun ems-insert-fortune ()
"Inserts a random fortune at point in the current buffer."
(interactive)
 (insert (seq-random-elt ems-fortunes)))
```


#### <span class="section-num">2.8.3</span> Brave Old World {#brave-old-world}


##### <span class="section-num">2.8.3.1</span> Character Templates {#character-templates}

<a id="code-snippet--bow-character-templates-elisp"></a>
```elisp
(setq bow-character-templates
 '(("academic"
(description . "An out of work */academic/*.")
(skills . ("lying"))
(knowledge . ("reading and writing"))
(motive . "They're here because they've hear of strange happenings in the region, and where there's mystery, there's money."))
("chandlers-guild-investigator"
(description . "A high-ranking */investigator/* from the /Chandlers Guild/.")
(skills . ("negotiation"))
(knowledge . ("bureaucracy")))
("local-rancher"
(description . "A local */rancher/*.")
(skills . ("nagivating the region" "arm wrestling"))
(knowledge . ("local fauna and flora")))))
```


##### <span class="section-num">2.8.3.2</span> Functions {#functions}

<a id="code-snippet--bow-read-character-template-elisp"></a>
```elisp
(defun bow-read-character-template (character)
  "Reads the CHARACTER from the list of character templates."
  (assoc character bow-character-templates))
```

<a id="code-snippet--bow-read-character-template-skills-elisp"></a>
```elisp
(defun bow-read-character-template-skills (character)
  "Reads the skills of CHARACTER from the list of character templates."
  (cdr (assoc 'skills (bow-read-character-template character))))
```

<a id="code-snippet--bow-read-character-template-knowledge-elisp"></a>
```elisp
(defun bow-read-character-template-knowledge (character)
  "Reads the knowledges of CHARACTER from the list of character templates."
  (cdr (assoc 'knowledge (bow-read-character-template character))))
```

<a id="code-snippet--bow-read-character-template-description-elisp"></a>
```elisp
(defun bow-read-character-template-description (character)
  "Reads the description of CHARACTER from the list of character templates."
  (cdr (assoc 'description (bow-read-character-template character))))
```

<a id="code-snippet--bow-read-character-template-motive-elisp"></a>
```elisp
(defun bow-read-character-template-motive (character)
  "Reads the motive of CHARACTER from the list of character templates."
  (cdr (assoc 'motive (bow-read-character-template character))))
```

<a id="code-snippet--bow-build-character-template-elisp"></a>
```elisp
(defun bow-build-character-template (character)
  "Build a character template paragraph from the CHARACTER template."
  (let ((description (bow-read-character-template-description character))
	(skills (bow-read-character-template-skills character))
	(knowledge (bow-read-character-template-knowledge character))
	(motive (bow-read-character-template-motive character)))
    (concat
     description
     (if (or skills knowledge)
	 (concat " Among other qualities, they're "
		 (if skills
		     (concat "skilled at "
			     (ems-oxfordize-list skills)
			     (if knowledge
				 " and ")))
		 (if knowledge
		     (concat "knowledgeable about "
			     (ems-oxfordize-list knowledge)
			     ".")))))))
```

Why am I using strings for the character types, instead of symbols? I don't yet know how to properly convert between strings and symbols, so it makes using it inside an Org-mode macro easier. As that's the goal of the function, I wrote it "poorly" in that way so I could just use it.


##### <span class="section-num">2.8.3.3</span> Complete Brave Old World "Package" {#complete-brave-old-world-package}

<a id="org526f8b9"></a>

\#+begin\_src elisp
<a id="orgc6bd84d"></a>
<a id="org5fbf766"></a>
<a id="org53724d2"></a>
<a id="org03eb212"></a>
<a id="org24f41a8"></a>
<a id="org6e03038"></a>
<a id="org6bc6613"></a>
\#+end\_src elisp


#### <span class="section-num">2.8.4</span> Personal Dictionary {#personal-dictionary}


##### <span class="section-num">2.8.4.1</span> Data {#data}

<a id="code-snippet--ems-dict-data-elisp"></a>
```elisp
(setq ems-dict
'(("hugo-theme"
(definition . "A collection of resources for Hugo, a static website generator, providing layouts for templating the site's content.")
(source . "https://gohugo.io/themes/"))))
```


##### <span class="section-num">2.8.4.2</span> Functions {#functions}


###### <span class="section-num">2.8.4.2.1</span> Read Dict Definition {#read-dict-definition}

<a id="code-snippet--ems-read-dict-definition-elisp"></a>
```elisp
(defun ems-read-dict-definition
(term)
"Return the definition of TERM from ems-dict."
(cdr (assoc 'definition (ems-dict-read-term term))))
```


###### <span class="section-num">2.8.4.2.2</span> Read Dict Source {#read-dict-source}

<a id="code-snippet--ems-read-dict-source-elisp"></a>
```elisp
(defun ems-read-dict-source
(term)
"Return the source of TERM from ems-dict."
(cdr (assoc 'source (ems-dict-read-term term))))
```


###### <span class="section-num">2.8.4.2.3</span> Read Dict Term {#read-dict-term}

<a id="code-snippet--ems-read-dict-term-elisp"></a>
```elisp
(defun ems-dict-read-term
(term)
"Returns the TERM from my dictionary."
(cdr (assoc term ems-dict)))
```


##### <span class="section-num">2.8.4.3</span> Complete Personal Dictionary "Package" {#complete-personal-dictionary-package}

<a id="code-snippet--ems-dict-elisp"></a>
```elisp
(setq ems-dict
'(("hugo-theme"
(definition . "A collection of resources for Hugo, a static website generator, providing layouts for templating the site's content.")
(source . "https://gohugo.io/themes/"))))
(defun ems-read-dict-definition
(term)
"Return the definition of TERM from ems-dict."
(cdr (assoc 'definition (ems-dict-read-term term))))
(defun ems-read-dict-source
(term)
"Return the source of TERM from ems-dict."
(cdr (assoc 'source (ems-dict-read-term term))))
(defun ems-dict-read-term
(term)
"Returns the TERM from my dictionary."
(cdr (assoc term ems-dict)))
```


#### <span class="section-num">2.8.5</span> Document Plating {#document-plating}


##### <span class="section-num">2.8.5.1</span> Data {#data}


##### <span class="section-num">2.8.5.2</span> Functions {#functions}


##### <span class="section-num">2.8.5.3</span> Complete Document Plating "Package" {#complete-document-plating-package}


### <span class="section-num">2.9</span> Functions {#functions}


#### <span class="section-num">2.9.1</span> Cap First Character {#cap-first-character}

<a id="code-snippet--ems-cap-first-char-elisp"></a>
```elisp
(defun ems-cap-first-char (alpha)
  "Return ALPHA with the first character capitalized."
  (concat
   (capitalize (substring alpha nil 1))
   (substring alpha 1)))
```


#### <span class="section-num">2.9.2</span> Build Document ELI {#build-document-eli}

<a id="code-snippet--ems-build-document-eli-elisp"></a>
```elisp
(defun ems-build-document-eli (eli)
  "Returns a string about the editorial and licensing information of the open Org-mode buffer."
  (concat
   "This document was written by me, {{{author}}}, in the United States. "
   (if (string-equal eli "default")
      "To the extent possible under law, I have waived all copyright and related or neighboring rights to this {{{doc}}}. This {{{doc}}} was created for the benefit of the public.")))
```


#### <span class="org-todo todo DRAFT">DRAFT</span> <span class="section-num">2.9.3</span> Open Project Source File {#open-project-source-file}

I keep all my projects in `~/src/<project-slug>/source.org`. I'd like a little command (and hotkey) to open that file without having to type more than the project slug.


#### <span class="section-num">2.9.4</span> Oxfordize List {#oxfordize-list}

<a id="code-snippet--ems-oxfordize-list-elisp"></a>
```elisp
(defun ems-oxfordize-list (list)
  (let ((len (length list)))
    (cond ((= len 1)
	   (car list))
	  ((= len 2)
	   (concat (car list) " and " (cadr list)))
	  (t
	   (setcar (last list)
		   (concat "and " (car (last list))))
	   (string-join list ", ")))))
```


#### <span class="section-num">2.9.5</span> Read Document Type {#read-document-type}

<a id="code-snippet--ems-read-document-type-elisp"></a>
```elisp
(defun ems-read-document-type ()
"This function returns a string containing a noun disclosing the type, based on form and function, of the document represented in the current Org-mode buffer."
(let ((document-type (cdr (assoc "document-type" org-macro-templates))))
document-type))
```


#### <span class="section-num">2.9.6</span> Slug-Case String {#slug-case-string}

The following Elisp function takes a string and returns it slug-cased.

<a id="code-snippet--ems-slugify-elisp"></a>
```elisp
(defun ems-slugify (str)
  (replace-regexp-in-string
   " " "-"
   (replace-regexp-in-string
    "[^[:alnum:]()]" " "
    (replace-regexp-in-string
     "\\." ""
     (replace-regexp-in-string
      "&" " and "
      (downcase str))))))
```

<div class="src-block-caption">
  <span class="src-block-number"><a href="#code-snippet--ems-slugify-elisp">Code Snippet 14</a></span>:
  An elisp declaration defining the <code>ems-slugify</code> function, which returns the given string in slug-casing.
</div>


## <span class="section-num">3</span> Supplements {#supplements}



### <span class="section-num">3.1</span> Random Tips {#random-tips}

-   Try hitting `C-x 8 *` and then a character like \* or S - it'll insert its "fancy" equivalent like • or §.


### <span class="section-num">3.2</span> All Elisp Together {#all-elisp-together}

This is tangled to `~/.emacs.d/init.el`, becoming my Emacs configuration.

```elisp
(package-initialize)
(require 'package)
(add-to-list 'package-archives
	     '("melpa" . "http://melpa.org/packages/") t)
(add-to-list 'package-archives '("org" . "https://orgmode.org/elpa/") t)
(eval-when-compile
  (add-to-list 'load-path "~/.emacs.d/elpa")
  (add-to-list 'load-path "~/.emacs.d/git")
  (require 'use-package))

(use-package auto-package-update
	     :ensure t
	     :config
	     (setq auto-package-update-delete-old-versions t)
	     (setq auto-package-update-hide-results t)
	     (auto-package-update-maybe))
(setq inhibit-startup-message t)
(setq initial-scratch-message nil)
(setq ring-bell-function 'ignore)
(setq show-paren-delay 0)
(show-paren-mode 1)
(setq echo-keystrokes 0.1)
(setq fill-column 68)
(setq mouse-wheel-scroll-amount '(1 ((shift) .1)))
(setq line-number-mode t)
(setq column-number-mode t)
(setq-default truncate-lines t)
(setq-default line-spacing 1)
(setq sentence-end-double-space nil)
(set-face-attribute 'default nil :family "IBM Plex Monospace")
(set-face-attribute 'fixed-pitch nil :family "IBM Plex Monospace")
(set-face-attribute 'variable-pitch nil :family "IBM Plex Serif")
(add-hook 'before-save-hook 'delete-trailing-whitespace)
(defadvice load-theme (before theme-dont-propagate activate)
  (mapc #'disable-theme custom-enabled-themes))
(use-package poet-theme
	   :ensure t
	   :after org
	   :config
	   (load-theme 'poet-monochrome t))
(use-package flyspell
  :ensure t
  :after writegood
  :init
  (progn
    (writegood-mode 1)))
(use-package htmlize
	     :ensure t)
(use-package magit
	     :ensure t)

(use-package org
  :mode (("\\.org$" . org-mode) ("\\.inc$" . org-mode))
  :ensure org-plus-contrib
:bind (("C-c l" . org-store-link)
       ("C-c c" . org-capture)
       ("C-c a" . org-agenda)
       ("C-c b" . org-iswitchb)
       ("C-c C-w" . org-refile)
       ("C-c j" . org-clock-goto)
       ("C-c C-x C-o" . org-clock-out))
:config
(progn
(setq org-log-done t)
(setq org-log-into-drawer "LOGBOOK")
(setq org-image-actual-width nil)
(setq org-hide-emphasis-markers t)
(setq org-ellipsis "→")
(set-face-attribute 'org-level-1 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-2 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-3 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-4 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-5 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-6 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-7 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-level-8 nil :height 140 :family "IBM Plex Sans")
(set-face-attribute 'org-document-title nil :height 140 :family "IBM Plex Sans")

(add-hook 'org-mode-hook
'visual-line-mode)
(setq org-agenda-custom-commands
      '(("A" "Agenda and TODO"
	 ((agenda "" )
	  (alltodo "" )))))
(setq org-agenda-todo-ignore-scheduled 'all)
(setq org-agenda-files '("~/org/personal/src/index.org"))

(setq org-link-abbrev-alist '(
			      ("ems-domestic-manual" . "file:~/org/src/domestic-manual.org::#%s")))
(setq org-export-allow-bind-keywords t)
(setq org-export-with-sub-superscripts nil)
(setq org-export-with-special-strings nil)
(setq org-export-with-smart-quotes nil)
(setq org-export-with-section-numbers nil)
(setq org-export-with-toc nil)
(setq org-export-with-todo-keywords nil)
(setq org-export-headline-levels 10)
(setq org-html-style-default nil)

(setq org-todo-keywords
'((sequence "DRAFT" "EDIT" "|" "DONE")
  (sequence "|" "CANCELED")))

(setq org-capture-templates
      '(("s" "New Source File" plain (file "~/org/triage/source-capture.org")
	 "#+SETUPFILE: ~/org/templates/setupfile0.org\n#+TITLE: %^{TITLE}\n#+EXPORT_FILE_NAME: ../pub/%^{SLUG}\n* Introduction\n%?\n#+INCLUDE: \"./eli.org::#draft\"\n#+INCLUDE: \"./eli.org::#eli\"\n* %\\1\n  :PROPERTIES:\n  :CUSTOM_ID: contents\n  :END:\n* Supplements\n#+INCLUDE: \"./mit-license.org::#license\"")
	("l" "New Log Entry" entry (file+olp+datetime "~/org/personal.org" ["Logs"])
	 ""
	 )
	("a" "Activity" item (file+datetree "~/org/projects/personal-data/activities.org")
	 "%U :: %?")
	("b" "Bibliography" entry (file+olp "~/org/projects/emacs-configuration/source.org" "Emacs Configuration" "Packages" "Org-mode" "Macros" "Bibliography Macros")
	 "* %^{TITLE}\n#+begin_src elisp\n(\"%^{SLUG}-title\" . \"%\\1\")\n(\"%\\2-author\" . \"%^{AUTHOR}\")\n(\"%\\2-source\" . \"%^{SOURCE}\")\n(\"%\\2-opinion\" . \"%^{OPINION}\")\n#+end_src")))

(setq org-publish-project-alist
      '(
	("state-of-iranian-communication"
	 :base-directory "~/org/projects/state-of-iranian-communication/src/"
	 :base-extension "org"
	 :publishing-directory "~/org/projects/state-of-iranian-communication/"
	 :publishing-function (org-html-publish-to-html org-latex-export-to-pdf org-org-export-to-org)
	 )
	("personal-dictionary"
	 :base-directory "~/org/projects/personal-dictionary/"
	 :base-extension ""
	 :include "source.org"
	 :makeindex t
	 :publishing-directory "~/org/projects/personal-dictionary/"
	 :publishing-function (org-html-publish-to-html)
	 )
	("30-days-of-world-building-summer-2019"
	 :base-directory "~/org/projects/30-days-of-world-building-summer-2019/src/"
	 :base-extension "org"
	 :publishing-directory "~/org/projects/30-days-of-world-building-summer-2019/"
	 :publishing-function org-html-publish-to-html)
	("public-html"
	 :base-directory "~/"
	 :base-extension "org"
	 :recursive t
	 :exclude "pr.org"
	 :makeindex t
	 :auto-sitemap t
	 :publishing-directory "~/public-html/"
	 :publishing-function (org-html-publish-to-html))))
(setq org-export-global-macros
      '(
("source" .
 "(eval (concat \"See [[\"(ems-read-dict-source \"\$1\") \"]].\"))")
("define" .
 "(eval (ems-read-dict-definition \$1))")
("Define" .
 "(eval (ems-cap-first-char (ems-read-dict-definition \$1)))")
("ref" .
 "{{{Define(\$1)}}} {{{source(\$1)}}}")
("document-type" .
 "document")
("doc" .
 "{{{document-type}}}")
("document-eli" .
 "(eval (ems-build-document-eli \$1))")
("bow-character-template" .
 "(eval (ems-bow-build-character-template \$1))")
("bow-adventure-brief" . "*/{{{title}}}/* is a /tabletop role-playing *{{{doc}}}*/ in which {{{property(adventure-inwhich)}}}, usually taking between {{{property(adventure-length)}}} to complete.")))
(org-babel-do-load-languages
 'org-babel-load-languages
 '((crystal . t)
   (ledger . t)
   (shell . t)))))
(use-package org-bullets
  :ensure t
  :after org
  :config
  (add-hook 'org-mode-hook (lambda () (org-bullets-mode 1))))
(use-package ox-gfm
  :after org
  :ensure t)
(use-package ox-hugo
  :after org
  :ensure t)

(use-package pretty-mode
  :ensure pretty-mode
  :config
  (progn
    (global-pretty-mode t)
    (global-prettify-symbols-mode 1)
    (pretty-deactivate-groups
     '(:equality :ordering :order-double :ordering-triple :arrows
		 :arrows-twoheaded :punctuation :logic :sets))
    (pretty-activate-groups
     '(:sub-and-superscripts :greek :arithmetic-nary))))

(use-package webpaste
  :ensure t
  :bind (("C-c C-p C-b" . webpaste-paste-buffer)
	 ("C-c C-p C-r" . webpaste-paste-region))
  :config
  (progn
    (setq webpaste-provider-priority '("ptpb.pw"))))
(use-package writegood-mode
  :ensure t
  :bind (("\C-c\C-gg" . writegood-grade-level)
	 ("\C-c\C-ge" . writegood-reading-ease))
  :init
  (progn
    (writegood-mode 1))
  :config
  (progn
    (setq ispell-program-name "aspell")
    (setq ispell-list-command "--list") ;; run flyspell with aspell, not ispell
  ))
(defun ems-read-something
    ()
  "Return a random element's cdr, which should be a string that is a URL, from the ems-reading-list variable."
  (cdr (assoc 'source (cdr (seq-random-elt (cdr (assoc 'pending ems-reading-log)))))))
(defun ems-read-something-now ()
  "Opens a random item from the pending reading list."
  (interactive) (browse-url (ems-read-something)))
(defun ems-plan-to-read
    (tit auth src)
  "Adds an item to my reading list"
  (interactive "sTitle? \nsAuthor? \nsSource? ")
  (push
   (cons tit (cons (cons 'author auth) (list (cons 'source src))))
   (cdr (assoc 'pending ems-reading-log))))
(setq ems-fortunes
'("Rome wasn't built in a day and you shouldn't aspire for your mind to be any less."
"Our society is not sustained by mortar and stone."))
(defun ems-insert-fortune ()
"Inserts a random fortune at point in the current buffer."
(interactive)
 (insert (seq-random-elt ems-fortunes)))
(setq ems-dict
'(("hugo-theme"
(definition . "A collection of resources for Hugo, a static website generator, providing layouts for templating the site's content.")
(source . "https://gohugo.io/themes/"))))
(defun ems-read-dict-definition
(term)
"Return the definition of TERM from ems-dict."
(cdr (assoc 'definition (ems-dict-read-term term))))
(defun ems-read-dict-source
(term)
"Return the source of TERM from ems-dict."
(cdr (assoc 'source (ems-dict-read-term term))))
(defun ems-dict-read-term
(term)
"Returns the TERM from my dictionary."
(cdr (assoc term ems-dict)))

(defun ems-cap-first-char (alpha)
  "Return ALPHA with the first character capitalized."
  (concat
   (capitalize (substring alpha nil 1))
   (substring alpha 1)))
(defun ems-build-document-eli (eli)
  "Returns a string about the editorial and licensing information of the open Org-mode buffer."
  (concat
   "This document was written by me, {{{author}}}, in the United States. "
   (if (string-equal eli "default")
      "To the extent possible under law, I have waived all copyright and related or neighboring rights to this {{{doc}}}. This {{{doc}}} was created for the benefit of the public.")))
(defun ems-oxfordize-list (list)
  (let ((len (length list)))
    (cond ((= len 1)
	   (car list))
	  ((= len 2)
	   (concat (car list) " and " (cadr list)))
	  (t
	   (setcar (last list)
		   (concat "and " (car (last list))))
	   (string-join list ", ")))))
(defun ems-read-document-type ()
"This function returns a string containing a noun disclosing the type, based on form and function, of the document represented in the current Org-mode buffer."
(let ((document-type (cdr (assoc "document-type" org-macro-templates))))
document-type))
(defun ems-slugify (str)
  (replace-regexp-in-string
   " " "-"
   (replace-regexp-in-string
    "[^[:alnum:]()]" " "
    (replace-regexp-in-string
     "\\." ""
     (replace-regexp-in-string
      "&" " and "
      (downcase str))))))
```