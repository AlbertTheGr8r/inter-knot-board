export function childElements(
  parent: Element | Document,
  localName?: string,
): Element[] {
  const children = Array.from(parent.children ?? []);
  return localName
    ? children.filter((child) => child.localName === localName)
    : children;
}

export function firstChildElement(
  parent: Element | Document,
  localName: string,
): Element | undefined {
  return childElements(parent, localName)[0];
}

export function descendants(
  parent: Element | Document,
  localName: string,
): Element[] {
  return Array.from(parent.getElementsByTagNameNS("*", localName));
}

export function childText(
  parent: Element | Document,
  localName: string,
): string | undefined {
  const element = firstChildElement(parent, localName);
  if (!element) return undefined;
  const value = element.textContent?.trim();
  return value ? value : undefined;
}

export function descendantText(
  parent: Element | Document,
  localName: string,
): string | undefined {
  const element = descendants(parent, localName)[0];
  if (!element) return undefined;
  const value = element.textContent?.trim();
  return value ? value : undefined;
}

export function attribute(
  element: Element | undefined,
  name: string,
): string | undefined {
  const value = element?.getAttribute(name)?.trim();
  return value ? value : undefined;
}

export function atomLink(
  parent: Element | Document,
  relation = "alternate",
): string | undefined {
  const links = childElements(parent, "link");
  const preferred =
    links.find(
      (link) =>
        attribute(link, "rel") === relation &&
        (attribute(link, "type") ?? "text/html").includes("html"),
    ) ?? links.find((link) => attribute(link, "rel") === relation);

  return (
    attribute(preferred, "href") ??
    attribute(
      links.find((link) => attribute(link, "href")),
      "href",
    )
  );
}

export function collapseWhitespace(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

/** Titles are occasionally HTML even when the feed says they are plain. */
export function plainText(value: string | undefined): string {
  return collapseWhitespace((value ?? "").replace(/<[^>]*>/g, " "));
}

export function firstValidDate(
  values: Array<string | undefined>,
): string | undefined {
  for (const value of values) {
    if (!value) continue;
    const time = Date.parse(value);
    if (Number.isNaN(time)) continue;
    return new Date(time).toISOString();
  }
  return undefined;
}

/** RSS authors are often `email (Display Name)` or `/u/name`. */
export function cleanAuthor(value: string | undefined): string | undefined {
  const author = collapseWhitespace(value);
  if (!author) return undefined;

  const named = author.match(/\(([^)]+)\)\s*$/);
  if (named?.[1] && author.includes("@")) {
    return named[1].trim();
  }

  return author.replace(/^\/u\//, "u/");
}
