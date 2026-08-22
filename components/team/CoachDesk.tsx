'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  MagnifyingGlass, PaperPlaneTilt, Eye, ChatText, FileText, Clock,
  CaretDown,
} from '@phosphor-icons/react';
import { ClipboardText as ClipboardList, Paperclip } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface MemberStat {
  userId: string;
  displayName: string;
  role: string;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
  compliance: number;
}

interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  displayName: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface CoachDeskProps {
  workspaceId: string;
  memberStats: MemberStat[];
  members: WorkspaceMember[];
  myRole: string;
}

type DeskTab = 'chat' | 'assignments' | 'templates' | 'history';

function getRiskLevel(compliance: number, pnl: number): 'low' | 'medium' | 'high' {
  if (compliance < 50 || pnl < -2000) return 'high';
  if (compliance < 75 || pnl < -500) return 'medium';
  return 'low';
}

const RISK_COLOR: Record<'low' | 'medium' | 'high', string> = {
  low: 'var(--green)',
  medium: 'var(--amber)',
  high: 'var(--red)',
};

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  return (
    <span className="chip" style={{ height: 22, padding: '0 9px', fontSize: 10.5, color: RISK_COLOR[level] }}>
      <i style={{ background: RISK_COLOR[level] }} />
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </span>
  );
}

export default function CoachDesk({ workspaceId, memberStats, members, myRole }: CoachDeskProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeskTab>('chat');
  const [messageText, setMessageText] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = useMutation(api.workspaces.sendMessage);

  // Select first student by default
  const students = members.filter(m => m.role === 'member' || m.role === 'coach' || m.role === 'admin' || m.role === 'owner');
  const filteredStudents = searchQuery.trim()
    ? students.filter(s => s.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    : students;

  const selectedUser = selectedUserId
    ? students.find(s => s.userId === selectedUserId)
    : students[0];
  const selectedStat = selectedUser
    ? memberStats.find(s => s.userId === selectedUser.userId)
    : null;

  const messages = useQuery(
    api.workspaces.getMessages,
    selectedUser ? { workspaceId, otherUserId: selectedUser.userId } : 'skip'
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedUser) return;
    await sendMessage({
      workspaceId,
      toUserId: selectedUser.userId,
      message: messageText.trim(),
      visibility,
    });
    setMessageText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const risk = selectedStat
    ? getRiskLevel(selectedStat.compliance, selectedStat.totalPnL)
    : 'low';

  const deskTabs: { id: DeskTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <ChatText size={14} /> },
    { id: 'assignments', label: 'Assignments', icon: <ClipboardList size={14} /> },
    { id: 'templates', label: 'Templates', icon: <FileText size={14} /> },
    { id: 'history', label: 'History', icon: <Clock size={14} /> },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 -mx-4 sm:-mx-6 -my-6" style={{ background: 'var(--panel)' }}>
      {/* Left: student list */}
      <div className="w-[280px] shrink-0 flex flex-col" style={{ borderRight: '1px solid var(--line)' }}>
        {/* Search */}
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <div
            className="flex items-center gap-2"
            style={{ height: 38, padding: '0 12px', borderRadius: 2, border: '1px solid var(--line)', background: 'var(--panel-2)' }}
          >
            <MagnifyingGlass size={14} className="shrink-0" style={{ color: 'var(--muted-3)' }} />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 0, outline: 'none', fontSize: 12.5, color: 'var(--text)', width: '100%' }}
            />
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto">
          {filteredStudents.map(student => {
            const stat = memberStats.find(s => s.userId === student.userId);
            const isSelected = selectedUser?.userId === student.userId;
            return (
              <button
                key={student.userId}
                onClick={() => setSelectedUserId(student.userId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left relative"
                style={{
                  borderBottom: '1px solid var(--hair)',
                  background: isSelected ? 'var(--panel-2)' : 'transparent',
                }}
              >
                {isSelected && (
                  <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--amber)' }} />
                )}
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 32, height: 32, borderRadius: 2, background: 'var(--panel-2)',
                    border: '1px solid var(--line)', fontFamily: 'var(--display)',
                    fontWeight: 700, fontSize: 13, color: 'var(--amber)',
                  }}
                >
                  {student.displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate" style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: isSelected ? 'var(--amber)' : 'var(--text)' }}>
                    {student.displayName}
                  </p>
                  <p className="truncate" style={{ margin: '3px 0 0', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--muted-2)' }}>
                    {stat
                      ? `${stat.totalPnL >= 0 ? '+' : '-'}$${Math.abs(stat.totalPnL).toFixed(0)} · ${stat.totalTrades} trades`
                      : 'No data'}
                  </p>
                </div>
                <span className="shrink-0" style={{ width: 7, height: 7, borderRadius: 1, background: 'var(--green)' }} />
              </button>
            );
          })}
          {filteredStudents.length === 0 && (
            <p className="empty-line" style={{ padding: '30px 0', fontSize: 12.5 }}>No students found</p>
          )}
        </div>
      </div>

      {/* Center: chat / content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            {/* Student header */}
            <div
              className="shrink-0 px-5 py-3 flex items-center justify-between gap-4"
              style={{ borderBottom: '1px solid var(--line)' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 36, height: 36, borderRadius: 2, background: 'var(--panel-2)',
                    border: '1px solid var(--line)', fontFamily: 'var(--display)',
                    fontWeight: 700, fontSize: 14, color: 'var(--amber)',
                  }}
                >
                  {selectedUser.displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15 }}>{selectedUser.displayName}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>Online</span>
                    <RiskBadge level={risk} />
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted-2)' }}>
                    {selectedStat?.totalTrades ?? 0} trades · {Math.round(selectedStat?.compliance ?? 0)}% compliance
                  </p>
                </div>
              </div>
              <button className="btn-a shrink-0" style={{ height: 34, fontSize: 12 }}>
                <Eye size={14} />
                View as Student
              </button>
            </div>

            {/* Tab bar */}
            <div className="tabs line shrink-0 px-5" style={{ marginBottom: 0 }}>
              {deskTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn('flex items-center gap-2', activeTab === tab.id && 'on')}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Chat content */}
            {activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {(!messages || messages.length === 0) ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="empty-line" style={{ padding: 0 }}>
                        No messages yet. Start the conversation with {selectedUser.displayName}.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {messages.map((msg, i) => {
                        const isMe = msg.fromUserId !== selectedUser.userId;
                        return (
                          <div key={i} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                            <div
                              className="max-w-[70%]"
                              style={{
                                padding: '10px 14px', borderRadius: 2, fontSize: 12.5, lineHeight: '19px',
                                background: isMe ? 'var(--amber)' : 'var(--panel-2)',
                                border: isMe ? '1px solid var(--amber)' : '1px solid var(--line)',
                                color: isMe ? 'var(--ink)' : 'var(--text-2)',
                              }}
                            >
                              {msg.message}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Message input */}
                <div className="shrink-0 px-5 pb-4">
                  <div style={{ border: '1px solid var(--line)', borderRadius: 2, background: 'var(--panel-2)', overflow: 'hidden' }}>
                    <textarea
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${selectedUser.displayName}...`}
                      rows={2}
                      className="w-full resize-none"
                      style={{ padding: '12px 14px', background: 'transparent', border: 0, outline: 'none', fontSize: 12.5, color: 'var(--text)' }}
                    />
                    <div className="flex items-center justify-between gap-2 px-3 pb-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={visibility}
                          onChange={e => setVisibility(e.target.value as 'private' | 'shared')}
                          style={{
                            height: 28, padding: '0 8px', borderRadius: 2,
                            border: '1px solid var(--line)', background: 'var(--panel)',
                            fontSize: 11, color: 'var(--text-2)', outline: 'none', cursor: 'pointer',
                          }}
                        >
                          <option value="private">Private (staff only)</option>
                          <option value="shared">Shared (visible to student)</option>
                        </select>
                        <button
                          className="flex items-center justify-center"
                          style={{ width: 28, height: 28, borderRadius: 2, border: '1px solid var(--line-2)', color: 'var(--muted)' }}
                          title="Attach"
                        >
                          <Paperclip size={14} />
                        </button>
                      </div>
                      <button
                        onClick={handleSend}
                        disabled={!messageText.trim()}
                        className={cn('flex items-center justify-center', !messageText.trim() ? 'btn-d' : 'btn-a')}
                        style={{ width: 34, height: 34, padding: 0 }}
                      >
                        <PaperPlaneTilt size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="empty-line" style={{ padding: 0 }}>
                  {activeTab === 'assignments' && 'Assignments coming soon'}
                  {activeTab === 'templates' && 'Templates coming soon'}
                  {activeTab === 'history' && 'History coming soon'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="empty-line" style={{ padding: 0 }}>Select a student to start coaching</p>
          </div>
        )}
      </div>

      {/* Right: stats sidebar */}
      {selectedUser && selectedStat && (
        <div
          className="w-[220px] shrink-0 p-4 overflow-y-auto hidden lg:block"
          style={{ borderLeft: '1px solid var(--line)' }}
        >
          <p className="lbl">STATS</p>

          <div className="flex flex-col gap-3" style={{ marginTop: 12 }}>
            <div className="inset" style={{ position: 'relative' }}>
              <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: selectedStat.totalPnL >= 0 ? 'var(--green)' : 'var(--red)' }} />
              <p className="lbl">NET P&amp;L</p>
              <p style={{
                margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 19, lineHeight: '24px',
                color: selectedStat.totalPnL >= 0 ? 'var(--green)' : 'var(--red)',
              }}>
                {selectedStat.totalPnL >= 0 ? '+' : '-'}${Math.abs(selectedStat.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="inset" style={{ position: 'relative' }}>
              <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--amber)' }} />
              <p className="lbl">WIN RATE</p>
              <p style={{ margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 19, lineHeight: '24px' }}>{Math.round(selectedStat.winRate)}%</p>
            </div>

            <div className="inset" style={{ position: 'relative' }}>
              <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--amber)' }} />
              <p className="lbl">TRADES</p>
              <p style={{ margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 19, lineHeight: '24px' }}>{selectedStat.totalTrades}</p>
            </div>

            <div className="inset" style={{ position: 'relative' }}>
              <span className="accent" style={{ position: 'absolute', left: 0, top: -1, width: 36, height: 3, background: 'var(--amber)' }} />
              <p className="lbl">COMPLIANCE</p>
              <p style={{ margin: '7px 0 0', fontFamily: 'var(--mono)', fontSize: 19, lineHeight: '24px' }}>{Math.round(selectedStat.compliance)}%</p>
            </div>
          </div>

          <p className="lbl" style={{ marginTop: 22 }}>QUICK ACTIONS</p>
          <div className="flex flex-col gap-2" style={{ marginTop: 12 }}>
            <button className="btn-a w-full" style={{ height: 36, fontSize: 12 }}>
              <Eye size={14} />
              View Dashboard
            </button>
            <button className="btn-g w-full" style={{ height: 36, fontSize: 12 }}>
              <ClipboardList size={14} />
              New Assignment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
