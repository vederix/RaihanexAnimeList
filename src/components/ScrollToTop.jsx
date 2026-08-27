import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop: Scroll halaman ke atas hanya ketika PATHNAME berubah
 * (navigasi antar halaman). Tidak mempengaruhi:
 *  - Perpindahan tab browser (Alt+Tab / klik tab lain)
 *  - Perubahan query string (?q=...)
 *  - Re-render komponen tanpa perubahan rute
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Hanya scroll jika pathname benar-benar berubah (bukan tab switch)
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname]);

  return null;
}
