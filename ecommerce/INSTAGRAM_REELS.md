# Instagram Reel metrics

The Reels feed gets media from `/{ig-user-id}/media` and requests `like_count` and
`comments_count` as diagnostic alternatives. It does not request the `view_count`
media field: Meta restricts that field outside Business Discovery. It requests
`total_views_count` directly from the media edge and requests
`views,total_views,reach` from `/{media-id}/insights`. The selected metric is
consistent across the feed, preferring the metric with the widest coverage and then
`views`, `total_views`, `plays`, `video_views`, and `reach` in that order.

With the required Insights access, the response can have this shape (illustrative):

```json
{
  "data": [
    {
      "name": "views",
      "values": [{ "value": 2358 }]
    },
    {
      "name": "reach",
      "values": [{ "value": 2100 }]
    }
  ]
}
```

For Facebook Login, Meta also exposes `total_views_count` on top-level video media.
It includes paid and organic views (and can include Facebook views for accessible
crossposts); unlike `view_count`, it is not restricted to Business Discovery.
Meta documents Insights `views` as plays on Instagram, `total_views` as views across
surfaces (Facebook Login only), and `reach` as unique Instagram accounts. `reach` is
not a view count, so the UI labels it accurately when used as a fallback.
`impressions` is deprecated for media created after July 2, 2024. The current v27.0
Insights metric list does not include `plays` or `video_views`; the parser still
recognizes these names if Meta returns them.

The media-edge response can contain direct counters even when Insights is denied
(illustrative):

```json
{
  "data": [
    {
      "id": "<reel-id>",
      "media_type": "VIDEO",
      "media_product_type": "REELS",
      "like_count": 42,
      "comments_count": 3,
      "total_views_count": 6432
    }
  ]
}
```

For Facebook Login, the Insights endpoint requires a professional Instagram account
and a token with `instagram_basic`, `instagram_manage_insights`, and
`pages_read_engagement`. The media edge (including `total_views_count`) requires
`instagram_basic` and `pages_read_engagement`; it does not depend on Insights
permission. The account/Page must be correctly connected to the token.
Standard Access is sufficient for accounts the app owns/manages and has added in
the App Dashboard. Advanced Access (and app review) is needed when serving accounts
outside that set. If the app user has a role on the connected Page through Business
Manager, Meta also lists `ads_management` and `ads_read` as requirements.
The previously observed response was an authorization error, not a metric payload:

```json
{
  "error": {
    "message": "(#10) Application does not have permission for this action",
    "type": "OAuthException",
    "code": 10
  }
}
```

When Insights is denied, `total_views_count` from the Facebook Login media edge can
still provide a view count if the media-read permissions allow it. If that field is
also absent, the feed displays recent Reels with an unavailable-count marker. It
does not substitute likes for views. `like_count` and `comments_count` are the best
media-edge alternatives to consider if neither view source is available; they are
requested for diagnostics but are not displayed. Likes and comments are not view
equivalents and should only be displayed with their own labels if selected as a
fallback.

The `[instagram-reels] Reel engagement metrics` server log reports whether
`view_count` and `total_views_count` were requested or returned, the metric names
and values from Insights, the diagnostic like/comment counts, and the final values
sent to cards. Set
`INSTAGRAM_DEBUG_REEL_RESPONSE=1` to log a sanitized media response sample and the
complete Insights response for one Reel. Access tokens, captions, and URL query
strings are redacted.

Official references:

- [Instagram Media Insights](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/insights)
- [Instagram Media fields](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/)
- [Instagram Platform Insights guide](https://developers.facebook.com/documentation/instagram-platform/insights)
- [Instagram API with Facebook Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login)
