"use client";

import { useEffect, useState } from "react";
import { CopyLinkButton } from "./CopyLinkButton";

export function CopyLinkWithOrigin({ path }: { path: string }) {
  const [url, setUrl] = useState(path);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  return <CopyLinkButton url={url} label="Copy / share link" />;
}
