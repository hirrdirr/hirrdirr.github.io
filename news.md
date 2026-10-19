---
layout: default
title: hirrdirr • news
navlabel: news
permalink: /news/
---

<div class="container reading-page">
{% assign news_posts = site.posts | where_exp: "p", "p.categories contains 'news'" %}
{% assign latest = news_posts.first %}

{% if latest %}
  <h1>{{ latest.title }}</h1>
  <p><small>{{ latest.date | date: "%Y-%m-%d" }}</small></p>

  <div class="news-latest">
    {{ latest.content }}
  </div>

  <p class="news-navigation">
    <a href="{{ '/news/archive/' | relative_url }}">→ Gå till arkivet</a>
  </p>
{% else %}
  <h1>News</h1>
  <p>Inga news-inlägg ännu.</p>
{% endif %}

</div>
