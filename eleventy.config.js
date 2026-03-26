import markdownIt from "markdown-it";
import { readFileSync } from "fs";

// Load custom ordering if available
function loadOrder() {
  try {
    return JSON.parse(readFileSync("src/_data/order.json", "utf-8"));
  } catch {
    return {};
  }
}

function sortByOrder(items, orderList) {
  if (!orderList || !orderList.length) {
    return items.sort((a, b) => (b.data.year || 0) - (a.data.year || 0));
  }
  const orderMap = {};
  orderList.forEach((slug, i) => orderMap[slug] = i);
  return items.sort((a, b) => {
    const aSlug = a.fileSlug;
    const bSlug = b.fileSlug;
    const ai = orderMap[aSlug] ?? 9999;
    const bi = orderMap[bSlug] ?? 9999;
    if (ai !== bi) return ai - bi;
    return (b.data.year || 0) - (a.data.year || 0);
  });
}

export default function(eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/images");

  // Admin SPA — selective (excludes server.js / config.yml)
  eleventyConfig.addPassthroughCopy({ "src/admin/index.html": "admin/index.html" });
  eleventyConfig.addPassthroughCopy({ "src/admin/admin.js": "admin/admin.js" });
  eleventyConfig.addPassthroughCopy({ "src/admin/admin.css": "admin/admin.css" });

  // Cloudflare Pages routing — forces /admin/* through Functions
  eleventyConfig.addPassthroughCopy({ "src/_routes.json": "_routes.json" });

  // Collections with custom ordering support
  eleventyConfig.addCollection("works", function(collectionApi) {
    const order = loadOrder();
    const all = collectionApi.getFilteredByGlob("src/content/works/*.md");
    // Group by category in order, then sort each group
    const categories = ["painting", "drawing", "new-media"];
    const result = [];
    for (const cat of categories) {
      const catItems = all.filter(item => item.data.category === cat);
      result.push(...sortByOrder(catItems, order[cat]));
    }
    // Add any uncategorized items at the end
    const categorized = new Set(result);
    const uncategorized = all.filter(item => !categorized.has(item));
    return [...result, ...uncategorized];
  });

  eleventyConfig.addCollection("paintings", function(collectionApi) {
    const order = loadOrder();
    const items = collectionApi.getFilteredByGlob("src/content/works/*.md")
      .filter(item => item.data.category === "painting");
    return sortByOrder(items, order["painting"]);
  });

  eleventyConfig.addCollection("drawings", function(collectionApi) {
    const order = loadOrder();
    const items = collectionApi.getFilteredByGlob("src/content/works/*.md")
      .filter(item => item.data.category === "drawing");
    return sortByOrder(items, order["drawing"]);
  });

  eleventyConfig.addCollection("newmedia", function(collectionApi) {
    const order = loadOrder();
    const items = collectionApi.getFilteredByGlob("src/content/works/*.md")
      .filter(item => item.data.category === "new-media");
    return sortByOrder(items, order["new-media"]);
  });

  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/posts/*.md")
      .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
  });

  // Filter: get featured works
  eleventyConfig.addFilter("featured", function(collection) {
    return collection.filter(item => item.data.featured);
  });

  // Filter: limit array
  eleventyConfig.addFilter("limit", function(arr, count) {
    return arr.slice(0, count);
  });

  // Date filter
  eleventyConfig.addFilter("date", function(value, format) {
    const d = new Date(value);
    if (format === "%B %Y") {
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (format === "%Y") {
      return d.getFullYear().toString();
    }
    return d.toLocaleDateString("en-US");
  });

  // Truncate filter
  eleventyConfig.addFilter("truncate", function(str, len) {
    if (!str) return "";
    if (str.length <= len) return str;
    return str.substring(0, len) + "...";
  });

  // Striptags filter (also decodes HTML entities)
  eleventyConfig.addFilter("striptags", function(str) {
    if (!str) return "";
    return str.replace(/<[^>]*>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–');
  });

  // Markdown config
  let md = markdownIt({ html: true, linkify: true });
  eleventyConfig.setLibrary("md", md);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
