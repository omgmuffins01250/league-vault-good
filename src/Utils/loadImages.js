// Returns an array of URL strings sorted by filename
export function loadImages(globPattern) {
    const modules = import.meta.glob(globPattern, {
      eager: true,
      import: "default",
    });
    return Object.keys(modules).sort().map((k) => modules[k]);
  }
  