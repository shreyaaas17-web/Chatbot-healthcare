"use client";

import dynamic from "next/dynamic";
import type { Hospital } from "@/lib/demo-data";

const InteractiveMap = dynamic(() => import("@/components/InteractiveMap"), {
  ssr: false,
  loading: () => <div className="map-frame" aria-label="Loading map" />,
});

export default function HospitalMap(props: { hospitals: Hospital[]; center?: [number, number]; zoom?: number }) {
  if (!props.hospitals.length) return <div className="map-frame" />;
  return <div className="map-frame"><InteractiveMap {...props} /></div>;
}
