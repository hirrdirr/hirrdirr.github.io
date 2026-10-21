---
layout: default
title: hirrdirr • news
navlabel: news
permalink: /news/
section: news
---
{% assign news_posts = site.posts | where_exp: "p", "p.categories contains 'news'" %}
{% assign latest = news_posts.first %}
<div class="section-page news-page">
  <header class="news-masthead">
    <div class="news-nameplate"><p class="section-kicker">HIRRDIRR / OMVÄRLDSBEVAKNING</p><h1>Security<br> News<span class="pixel-period">.</span></h1><p>Säkerhet, teknik och digital infrastruktur.<br>Samlat från utvalda källor.</p></div>
    <div class="section-art newsroom-art" role="img" aria-label="Pixelkonst: en japansk säkerhetscentral med nätverksutrustning och övervakningsskärmar"></div>
  </header>
  <nav class="news-edition" aria-label="Nyhetsöversikt">
    {% if latest %}<span>Senaste utgåvan <time datetime="{{ latest.date | date: '%Y-%m-%d' }}">{{ latest.date | date: '%Y-%m-%d' }}</time></span><a href="#digest">Läs sammanställningen ↓</a>{% endif %}
    <a href="{{ '/news/archive/' | relative_url }}">Nyhetsarkivet ↗</a>
  </nav>
  {% if latest %}
  <div class="news-desk">
    <article id="digest" class="news-digest" aria-labelledby="digest-title">
      <p class="section-kicker">SENASTE SAMMANSTÄLLNINGEN</p>
      <h2 id="digest-title">{{ latest.title | escape }}</h2>
      <p class="edition-date">Utgåva <time datetime="{{ latest.date | date: '%Y-%m-%d' }}">{{ latest.date | date: '%Y-%m-%d' }}</time> · <a href="{{ latest.url | relative_url }}">Permalänk</a></p>
      <div class="digest-copy">{{ latest.content }}</div>
    </article>
    <aside class="news-rail" aria-label="Artiklar och tidigare utgåvor">
      {% if site.data.security_highlights.articles.size > 0 %}
      <section class="news-highlights" aria-labelledby="highlights-title">
        <p class="section-kicker">UR NYHETSFLÖDET</p><h2 id="highlights-title">Nedslag</h2>
        <p class="edition-date">Sammanställt <time datetime="{{ site.data.security_highlights.digest_date }}">{{ site.data.security_highlights.digest_date }}</time></p>
        {% for item in site.data.security_highlights.articles %}
        <a class="news-brief" href="{{ item.url | escape }}" target="_blank" rel="noopener noreferrer">
          <div class="news-brief-image" aria-hidden="true"><span>Artikel<br>↗</span>{% if item.image %}<img src="{{ item.image | escape }}" loading="lazy" alt="" referrerpolicy="no-referrer" onerror="this.hidden=true">{% endif %}</div>
          <div><span class="brief-source">{{ item.source | escape }}</span><h3>{{ item.title | escape }}</h3></div>
        </a>
        {% endfor %}
      </section>
      {% endif %}
      <section class="recent-editions" aria-labelledby="editions-title"><p class="section-kicker">TIDIGARE UTGÅVOR</p><h2 id="editions-title">Från arkivet</h2><ul>{% if news_posts.size > 1 %}{% for post in news_posts offset:1 limit:4 %}<li><a href="{{ post.url | relative_url }}"><time datetime="{{ post.date | date: '%Y-%m-%d' }}">{{ post.date | date: '%Y-%m-%d' }}</time><span>{{ post.title | escape }}</span></a></li>{% endfor %}{% else %}<li>Inga tidigare utgåvor ännu.</li>{% endif %}</ul><a class="section-text-link" href="{{ '/news/archive/' | relative_url }}">Alla utgåvor ↗</a></section>
    </aside>
  </div>
  {% else %}
  <div class="section-empty"><h2>Inga nyhetsinlägg ännu</h2><p>Nästa säkerhetsdigest visas här när den har publicerats.</p></div>
  {% endif %}
</div>
