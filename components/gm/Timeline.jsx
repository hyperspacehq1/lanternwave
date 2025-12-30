"use client";

import React, { useState, useMemo } from "react";
import "./timeline.css";

export default function Timeline({ sessions = [], events = [], onSelectSession }) {
  const [expandedSessions, setExpanded] = useState({});

  // Sort sessions chronologically
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      return new Date(a.sessionDate || 0) - new Date(b.sessionDate || 0);
    });
  }, [sessions]);

  // Group events by session
  const eventsBySession = useMemo(() => {
    const groups = {};
    for (const ev of events) {
      if (!groups[ev.sessionId]) groups[ev.sessionId] = [];
      groups[ev.sessionId].push(ev);
    }

    // Sort events chronologically if timestamp exists
    for (const sid of Object.keys(groups)) {
      groups[sid].sort((a, b) => {
        const at = a.eventDate || a.timestamp || 0;
        const bt = b.eventDate || b.timestamp || 0;
        return new Date(at) - new Date(bt);
      });
    }

    return groups;
  }, [events]);

  const toggleSession = (sessionId) => {
    setExpanded((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  return (
    <div className="gm-timeline-root">
      <h2 className="gm-timeline-title">Timeline</h2>

      {sortedSessions.length === 0 && (
        <div className="gm-timeline-empty">No sessions created yet.</div>
      )}

      {sortedSessions.map((session) => {
        const sid = session.id;
        const isOpen = expandedSessions[sid];
        const sessionEvents = eventsBySession[sid] || [];

        return (
          <div key={sid} className="gm-session-block">
            {/* SESSION HEADER */}
            <div className="gm-session-header">
              <button
                className="gm-session-expand"
                onClick={() => toggleSession(sid)}
              >
                {isOpen ? "▾" : "▸"}
              </button>

              <div
                className="gm-session-info"
                onClick={() => {
                  onSelectSession(session);
                  if (!isOpen) toggleSession(sid);
                }}
              >
                <div className="gm-session-title">{session.name || session.description}</div>
                <div className="gm-session-date">
                  {session.sessionDate
                    ? new Date(session.sessionDate).toLocaleDateString()
                    : "No date"}
                </div>
              </div>
            </div>

            {/* EVENTS */}
            {isOpen && (
              <div className="gm-event-list">
                {sessionEvents.length === 0 && (
                  <div className="gm-event-empty">No events recorded.</div>
                )}

                {sessionEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="gm-event-item"
                    onClick={() => onSelectSession(session)}
                  >
                    <div className="gm-event-title">
                      {ev.title || ev.description || "(Untitled Event)"}
                    </div>
                    {ev.eventDate && (
                      <div className="gm-event-date">
                        {new Date(ev.eventDate).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
