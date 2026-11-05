"""Offline regression checks for Game Discovery's IGDB cache generation."""
import datetime as dt
import unittest

from tools.discover_releases import build, window


class TestDiscoverReleases(unittest.TestCase):
    def test_window_begins_on_monday_and_spans_eight_weeks(self):
        start, end = window(dt.date(2026, 11, 5))
        self.assertEqual(start, dt.date(2026, 10, 19))
        self.assertEqual(end, dt.date(2026, 12, 14))

    def test_normalizes_deduplicates_and_filters_pc_game_releases(self):
        start = dt.date(2026, 11, 2)
        end = dt.date(2026, 11, 16)
        timestamp = lambda d: int(dt.datetime.combine(d, dt.time.min, dt.timezone.utc).timestamp())
        rows = [
            {"game": 1, "date": timestamp(dt.date(2026, 11, 5))},
            {"game": 1, "date": timestamp(dt.date(2026, 11, 8))},
            {"game": 2, "date": timestamp(dt.date(2026, 11, 7))},
            {"game": 3, "date": timestamp(dt.date(2026, 11, 8))},
            {"game": 4, "date": timestamp(end)},
        ]
        games = {
            1: {"id": 1, "name": "Alpha", "game_type": 0, "rating": 88.456, "rating_count": 19,
                "genres": [{"name": "Indie"}], "cover": {"image_id": "co123"}, "slug": "alpha"},
            2: {"id": 2, "name": "DLC", "game_type": 1},
            3: {"id": 3, "name": "Version", "game_type": 0, "version_parent": 1},
            4: {"id": 4, "name": "Outside", "game_type": 0},
        }
        output = build(rows, games, start, end)
        self.assertEqual(len(output["games"]), 1)
        self.assertEqual(output["games"][0]["date"], "2026-11-05")
        self.assertEqual(output["games"][0]["rating"], 88.5)
        self.assertEqual(output["games"][0]["genres"], ["Indie"])

    def test_missing_ratings_and_names(self):
        start = dt.date(2026, 11, 2)
        end = dt.date(2026, 11, 9)
        ts = int(dt.datetime(2026, 11, 5, tzinfo=dt.timezone.utc).timestamp())
        out = build([{"game": 1, "date": ts}, {"game": 2, "date": ts}],
                    {1: {"name": "A", "game_type": 0}, 2: {"game_type": 0}}, start, end)
        self.assertIsNone(out["games"][0]["rating"])
        self.assertEqual(out["games"][0]["rating_count"], 0)
        self.assertEqual(len(out["games"]), 1)


if __name__ == "__main__":
    unittest.main()
