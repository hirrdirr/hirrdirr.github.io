---
layout: default
title: News Archive
permalink: /news/archive/
---

<div class="container reading-page">
<h1>News – Arkiv</h1>

{% assign news_posts = site.posts | where_exp: "p", "p.categories contains 'news'" %}

<ul>
  {% for post in news_posts %}
    <li>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      <small> — {{ post.date | date: "%Y-%m-%d" }}</small>
    </li>
  {% endfor %}
</ul>

<p class="news-navigation">
  <a href="{{ '/news/' | relative_url }}">← Till senaste</a>
</p>

</div>
