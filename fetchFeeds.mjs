// fetchFeeds.js
import fs from "fs/promises";
import fetch from "node-fetch";
import Parser from "rss-parser";

const ITEMS_PATH = "items.json";
const FEEDS_PATH = "feeds.json";

async function fetchAndParse(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const parser = new Parser();
  return parser.parseString(xml);
}

async function loadJson(path) {
  try {
    const raw = await fs.readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function main() {
  // Load feeds list and existing items
  const feeds = await loadJson(FEEDS_PATH);
  const stored = await loadJson(ITEMS_PATH);
  const seenLinks = new Set(stored.map(item => item.link));

  const newItems = [];

  for (const { source, url } of feeds) {
    try {
      const feed = await fetchAndParse(url);
      console.log(`\n📡 ${source} — ${url}`);

      for (const item of feed.items) {
        if (!seenLinks.has(item.link)) {
          seenLinks.add(item.link);
          newItems.push({
            source,
            title: item.title,
            link: item.link,
            pubDate: item.pubDate || new Date().toISOString(),
          });
          console.log(`  + ${item.title}`);
        }
      }
    } catch (err) {
      console.error(`Error fetching ${source} (${url}):`, err.message);
    }
  }

  if (newItems.length) {
    const allItems = [...stored, ...newItems];
    await fs.writeFile(ITEMS_PATH, JSON.stringify(allItems, null, 2));
    console.log(`\n✅ Saved ${newItems.length} new item(s) to ${ITEMS_PATH}`);
  } else {
    console.log("\n🔍 No new items found.");
  }
}

main().catch(err => console.error(err));