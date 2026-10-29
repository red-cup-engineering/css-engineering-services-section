;; curio-shop.lua
;; lua -> html

;; external dependencies
(local lustache (require "lustache"))


;; internal data structures
(local shop {})
(tset shop :fortunes {})
(tset shop :logs {})
(tset shop :projects {})


;; processing of external data
(fn stock [shelf entry] (table.insert (. shop shelf) entry))
(global fortune (fn [entry] (stock :fortunes entry)))
(global log (fn [entry] (stock :logs entry)))
(global project (fn [entry] (stock :projects entry)))

(fn process-file [filename]
 (print (.. "Loading " filename))
 ((assert (loadfile filename))))

(global make-shop
  (fn []
    (process-file "data/fortunes.lua")
    (process-file "data/logs.lua")
    (process-file "data/projects.lua")
    shop))

(fn render-html-opening []
  "<html>")

(fn render-html-head []
  (.. "<head><title>emsenn's stuff</title><style>"
      (with-open [fin (io.open :style.css)] (fin:read "*all"))
      "</style></head>"))
(fn render-html-header []
  (.. "<h1>emsenn's webpage</h1>"
      "<span>A big HTML document about emsenn and a lot of eir writing and "
      "projects.</span>"))

(fn render-html-closing []
  "</html>")

(fn render-html-body-opening []
  "<body>")
(fn render-html-body-closing []
  "</body>")

(fn render-html-article-opening []
  "<article>")
(fn render-html-article-closing []
  "</article>")

(fn render-html-main-opening []
  "<main>")
(fn render-html-main-closing []
  "</main>")

(fn render-html-log-entry [entry]
  (lustache:render
    (.. "<section class=\"log\" id=\"{{ date }}\">"
        "<span class=\"log-summary\">{{ date }}</span>"
        "<section class=\"log-content\">{{ content }}</section>"
        "</section>")
    entry))

(fn render-html-log-entry-toc []
  (var R "<ul id=\"logs\">")
  (each [key val (pairs (. shop :logs))]
    (set R
      (.. R (lustache:render "<li><a href=\"#log-{{ date }}\">{{ date }}</a></li>"
                             val))))
  (set R (.. R "</ul>"))
  R)

(fn render-html-project-entry [entry]
  (lustache:render
    (.. "<section class=\"log\" id=\"{{ id }}\">"
        "<span class=\"log-summary\">{{ name }}: {{ status }}</span>"
        "<section class=\"log-content\">{{ description }}</section>"
        "</section>")
    entry))

(fn render-html-project-entry-toc []
  (var R "<ul id=\"projects\">")
  (each [key val (pairs (. shop :projects))]
    (set R
      (.. R (lustache:render "<li><a href=\"#project-{{ id }}\">{{ name }}</a></li>"
                             val))))
  (set R (.. R "</ul>"))
  R)

(fn render-html-page-summary []
  (.. "<nav><ul>"
      "<li><a href=\"#logs\">Logs</a></li>"
      "<li><a href=\"#projects\">Projects</a></li>"
      "</ul></nav>"))
(fn render-html-fortunes []
  (var R "<span class=\"fortunes\">")
  (each [key val (pairs (. shop :fortunes))]
    (set R (.. R (. val :text))))
  (set R (.. R "</span>"))
  R)

(fn R []
  (var r "")
  (fn [?t]
    (if ?t
      (set r (.. r ?t))
      r)))

(global render-shop
  (fn []
    (local R! (R))
    (R! (render-html-opening))
    (R! (render-html-head))
    (R! (render-html-body-opening))
    (R! (render-html-article-opening))
    (R! (render-html-header))
    (R! (render-html-main-opening))
    (R! (render-html-page-summary))
    (R! (render-html-project-entry-toc))
    (each [key val (pairs (. shop :projects))]
      (R! (render-html-project-entry val)))
    (R! (render-html-log-entry-toc))
    (each [key val (pairs (. shop :logs))]
      (R! (render-html-log-entry val)))
    (R! (render-html-main-closing))
    (R! (render-html-article-closing))
    (R! (render-html-fortunes))
    (R! (render-html-body-closing))
    (R! (render-html-closing))
    (R!)))

(with-open [fout (io.open :output.html :w)]
  (fout:write (render-shop (make-shop))))

