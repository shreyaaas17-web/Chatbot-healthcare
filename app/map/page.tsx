import SiteNav from "@/components/SiteNav";
import MapExplorer from "@/components/MapExplorer";
import Footer from "@/components/Footer";

export default function MapPage(){return <div className="site-shell"><SiteNav/><main className="container page"><div className="eyebrow">FACILITY RADAR</div><h1 className="page-title">Care map</h1><p className="page-subtitle">Explore facilities and sort by approximate browser location.</p><MapExplorer/></main><Footer/></div>;}
