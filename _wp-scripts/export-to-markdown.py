#!/usr/bin/env python3
"""
One-time content migration: convert the POSTS / CASE_STUDIES Python data
lists (originally written to seed WordPress) into markdown files with YAML
frontmatter for the new Eleventy build. Run once, locally. Not deployed,
not part of the ongoing build.

Reads the two lists via `ast` (safe literal parsing — no code execution),
so it can't accidentally run anything else in those scripts.

Usage:
    python _wp-scripts/export-to-markdown.py
"""
import ast
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_SCRIPT = os.path.join(ROOT, "_wp-scripts", "veridian-wp-posts-create.py")
CASE_STUDIES_SCRIPT = os.path.join(ROOT, "_wp-scripts", "veridian-wp-case-studies-create.py")
BLOG_OUT = os.path.join(ROOT, "content", "blog")
CASE_OUT = os.path.join(ROOT, "content", "case-studies")


def load_list_literal(path, var_name):
    """Safely extract a top-level `VAR_NAME = [...]` list literal from a
    Python source file without executing the rest of the module."""
    with open(path, "r", encoding="utf-8") as f:
        source = f.read()
    tree = ast.parse(source, filename=path)
    for node in tree.body:
        if isinstance(node, ast.Assign):
            targets = [t.id for t in node.targets if isinstance(t, ast.Name)]
            if var_name in targets:
                return ast.literal_eval(node.value)
    raise ValueError(f"{var_name} not found in {path}")


# Editorial metadata not present in the Python source (it lived in the
# static manifest / was assigned at WordPress publish time). Assigned here
# so the migration has a single, explicit, reviewable source of truth.
# claude-fable-5-vendor-risk-lesson is dated newest (16 June 2026, matching
# the post's own June 2026 subject matter) and becomes the new featured
# cover post — it did not exist in the old manifest, which only had 7 posts.
POST_META = {
    "google-business-profile-vs-website": {
        "date": "2026-05-12",
        "image_alt": "A smartphone showing Google search and business listings",
        "featured": False,
    },
    "five-fixes-before-ads": {
        "date": "2026-04-28",
        "image_alt": "Person working on a laptop reviewing site analytics",
        "featured": False,
    },
    "reading-your-audit": {
        "date": "2026-04-14",
        "image_alt": "A whiteboard with handwritten notes and a checklist",
        "featured": False,
    },
    "site-speed-in-nigeria": {
        "date": "2026-03-30",
        "image_alt": "Close-up of a smartphone screen loading a webpage",
        "featured": False,
    },
    "responding-to-reviews": {
        "date": "2026-03-18",
        "image_alt": "A smartphone resting on a table",
        "featured": False,
    },
    "credibility-on-a-budget": {
        "date": "2026-03-04",
        "image_alt": "Person sitting in front of a laptop at a small workspace",
        "featured": False,
    },
    "nap-consistency": {
        "date": "2026-02-20",
        "image_alt": "Computer screen showing a Google search results page",
        "featured": False,
    },
    "claude-fable-5-vendor-risk-lesson": {
        "date": "2026-06-16",
        "image_alt": "Abstract server room with blue data lights",
        "featured": True,
    },
}


def estimate_read_time(html):
    text = re.sub(r"<[^>]+>", " ", html)
    words = [w for w in text.split() if w]
    mins = max(1, round(len(words) / 220))
    return f"{mins} min read"


def yaml_scalar(value):
    """Minimal, dependency-free YAML scalar quoting for frontmatter values."""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    s = str(value).replace('"', '\\"')
    return f'"{s}"'


def yaml_list(items):
    lines = ["["]
    lines.append(", ".join(yaml_scalar(i) for i in items))
    lines.append("]")
    return "".join(lines)


def write_frontmatter(path, fields, body):
    lines = ["---"]
    for key, value in fields.items():
        if isinstance(value, list):
            lines.append(f"{key}: {yaml_list(value)}")
        else:
            lines.append(f"{key}: {yaml_scalar(value)}")
    lines.append("---")
    content = "\n".join(lines) + "\n\n" + body.strip() + "\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def export_posts():
    posts = load_list_literal(POSTS_SCRIPT, "POSTS")
    os.makedirs(BLOG_OUT, exist_ok=True)
    for post in posts:
        slug = post["slug"]
        meta = POST_META.get(slug)
        if not meta:
            print(f"  ! WARNING: no editorial metadata for '{slug}' — skipping")
            continue
        image = f"/images/blog/{slug}.jpg"
        fields = {
            "title": post["title"],
            "category": post["category"],
            "date": meta["date"],
            "excerpt": post["excerpt"],
            "image": image,
            "image_alt": meta["image_alt"],
            "featured": meta["featured"],
            "read_time": estimate_read_time(post["content"]),
        }
        out_path = os.path.join(BLOG_OUT, f"{slug}.md")
        write_frontmatter(out_path, fields, post["content"])
        print(f"  wrote content/blog/{slug}.md")
    print(f"Exported {len(posts)} blog posts.")


# Existing local images (downloaded earlier this session) use short names,
# not the full slugs — map explicitly rather than rename files in place.
CASE_IMAGE = {
    "short-let-lekki-google-rebirth": "short-let-lekki.jpg",
    "law-firm-abuja-credibility-rebuild": "law-firm-abuja.jpg",
    "school-port-harcourt-google-profile-fix": "school-portal.jpg",
    "logistics-startup-lagos-speed-rebuild": "logistics-fleet.jpg",
}


def export_case_studies():
    studies = load_list_literal(CASE_STUDIES_SCRIPT, "CASE_STUDIES")
    os.makedirs(CASE_OUT, exist_ok=True)
    for cs in studies:
        slug = cs["slug"]
        image_file = CASE_IMAGE.get(slug)
        if not image_file:
            print(f"  ! WARNING: no image mapping for '{slug}' — skipping")
            continue
        image = f"/images/work/{image_file}"
        fields = {
            "industry": cs["industry"],
            "location": cs["location"],
            "tagline": cs["tagline"],
            "before_score": cs["before_score"],
            "after_score": cs["after_score"],
            "before": cs["before"],
            "after": cs["after"],
            "image": image,
            "image_alt": cs["industry"],
        }
        out_path = os.path.join(CASE_OUT, f"{slug}.md")
        write_frontmatter(out_path, fields, cs["narrative"])
        print(f"  wrote content/case-studies/{slug}.md")
    print(f"Exported {len(studies)} case studies.")


if __name__ == "__main__":
    print("Exporting blog posts...")
    export_posts()
    print("\nExporting case studies...")
    export_case_studies()
    print("\nDone. Review the files in content/blog/ and content/case-studies/.")
