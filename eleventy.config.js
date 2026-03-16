import markdownIt from "markdown-it";

export default function(eleventyConfig) {
  // Pass through static assets
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/admin");

  // Sort helper: by display order first, then by year descending as tiebreaker
  function sortByOrder(a, b) {
    const orderA = a.data.order ?? 100;
    const orderB = b.data.order ?? 100;
    if (orderA !== orderB) return orderA - orderB;
    return (b.data.year || 0) - (a.data.year || 0);
  }

  // Collections
  eleventyConfig.addCollection("works", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/works/*.md")
      .sort(sortByOrder);
  });

  eleventyConfig.addCollection("paintings", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/works/*.md")
      .filter(item => item.data.category === "painting")
      .sort(sortByOrder);
  });

  eleventyConfig.addCollection("drawings", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/works/*.md")
      .filter(item => item.data.category === "drawing")
      .sort(sortByOrder);
  });

  eleventyConfig.addCollection("newmedia", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/content/works/*.md")
      .filter(item => item.data.category === "new-media")
      .sort(sortByOrder);
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
