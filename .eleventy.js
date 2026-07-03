const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

module.exports = function (eleventyConfig) {
  // Only these two content types are templated. Every other page on the
  // site (index.html, about.html, services.html, software.html,
  // pricing.html, contact.html, audit.html, privacy.html, 404.html) stays
  // hand-authored flat HTML and is passed through unchanged below — this
  // migration is scoped to the blog/case-study pipeline only.
  eleventyConfig.setTemplateFormats(["njk", "md"]);

  // Static assets and untouched pages — copied byte-for-byte into _site/.
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("script.js");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("favicon.ico");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("sitemap.xml");
  eleventyConfig.addPassthroughCopy("index.html");
  eleventyConfig.addPassthroughCopy("about.html");
  eleventyConfig.addPassthroughCopy("services.html");
  eleventyConfig.addPassthroughCopy("software.html");
  eleventyConfig.addPassthroughCopy("pricing.html");
  eleventyConfig.addPassthroughCopy("contact.html");
  eleventyConfig.addPassthroughCopy("audit.html");
  eleventyConfig.addPassthroughCopy("privacy.html");
  eleventyConfig.addPassthroughCopy("404.html");

  // Matches the display format script.js's formatDate() already used
  // ("12 May 2026"), so migrated pages read identically to before.
  eleventyConfig.addFilter("friendlyDate", (value) => {
    const d = new Date(value);
    if (isNaN(d)) return "";
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  });

  eleventyConfig.addFilter("zeropad", (value, width = 2) =>
    String(value).padStart(width, "0")
  );

  eleventyConfig.addFilter("isoDate", (value) => {
    const d = new Date(value);
    if (isNaN(d)) return "";
    return d.toISOString().slice(0, 10);
  });

  // Related-posts pick: everything except the current post, capped at 3.
  eleventyConfig.addFilter("excludeSlug", (posts, slug, limit = 3) =>
    posts.filter((p) => p.fileSlug !== slug).slice(0, limit)
  );

  // Category tally for the blog filter chips — mirrors what
  // updateCategoryChips() used to compute client-side from live posts.
  eleventyConfig.addFilter("categoryTally", (posts) => {
    const tally = {};
    for (const p of posts) {
      const cat = (p.data.category || "").trim();
      if (cat) tally[cat] = (tally[cat] || 0) + 1;
    }
    return Object.keys(tally)
      .sort()
      .map((name) => ({ name, count: tally[name] }));
  });

  eleventyConfig.addCollection("post", (api) =>
    api.getFilteredByTag("post").sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("caseStudy", (api) =>
    api.getFilteredByTag("caseStudy")
  );

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
