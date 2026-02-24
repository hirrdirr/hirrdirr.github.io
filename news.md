---
layout: default
title: News
permalink: /news/
---

<h1>News</h1>
<p>Dagliga security-digests från utvalda källor.</p>

<ul>
  {% assign news_posts = site.posts | where_exp: "p", "p.categories contains 'news'" %}
  {% for post in news_posts %}
    <li>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      <small> — {{ post.date | date: "%Y-%m-%d" }}</small>
    </li>
  {% endfor %}
</ul>
