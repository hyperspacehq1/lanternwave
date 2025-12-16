"use client";

import Header from "@/components/Header";
import SearchBar from "@/components/gm/SearchBar";
import Timeline from "@/components/gm/Timeline";
import RelationshipGraph from "@/components/gm/RelationshipGraph";
import MapViewer from "@/components/gm/MapViewer";
import SessionPanel from "@/components/gm/SessionPanel";
import dynamic from "next/dynamic";
import "./gm-dashboard.css";

const Tools = dynamic(() => import("@/components/gm/Tools"), {
  ssr: false,
});

export default function GMDashboard() {
  return (
    <div className="lw-root">
      {/* Header now behaves exactly like Controller */}
      <Header />

      {/* Match Controller page structure */}
      <main className="lw-main">
        <div className="gm-root">
          <div className="gm-layout">
            <aside className="gm-sidebar">
              <SearchBar onSearch={(q) => console.log("search:", q)} />
            </aside>

            <main className="gm-main">
              <Timeline
                sessions={[]}
                events={[]}
                onSelectSession={(s) => console.log("session:", s)}
              />
            </main>

            <section className="gm-detail">
              <SessionPanel />
              <RelationshipGraph />
              <MapViewer />
              <Tools />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
