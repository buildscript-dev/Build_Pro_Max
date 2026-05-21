import React, { useState, useEffect, useRef } from 'react';
import { GlassCard, PaperButton, Icon, AiOrb } from '../components/ui/Icons';
import { useApp } from '../store/AppContext';
import { ScreenShell } from '../components/ui/ScreenShell';
import { uploadFile, deleteFile } from '../services/supabaseDb';

const FILE_KINDS = ['pdf', 'fig', 'sheet', 'img', 'audio'];
const DEVICE_NAMES = ['MacBook Pro', 'iPhone 15', 'iPad Pro', 'Studio (Mac mini)'];

export const Files = () => {
  const { state, actions, authUser } = useApp();
  const files = state.files || [];
  const devices = state.devices || [];
  const [showAdd, setShowAdd] = useState(false);
  const [newFile, setNewFile] = useState({ name: '', from: DEVICE_NAMES[0], to: DEVICE_NAMES[1], size: '1 MB', kind: 'pdf' });
  const filesRef = useRef(files);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Keep ref in sync with latest files
  useEffect(() => { filesRef.current = files; }, [files]);

  // Simulate progress for in-flight transfers
  useEffect(() => {
    const iv = setInterval(() => {
      filesRef.current.forEach(f => {
        if (f.progress < 90) {
          const inc = Math.random() * 15 + 2;
          const next = Math.min(90, f.progress + inc);
          actions.updateFileProgress(f.id, Math.round(next));
        }
      });
    }, 800);
    return () => clearInterval(iv);
  }, [actions]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!authUser?.id) {
      actions.addNotification({ text: 'Sign in to upload files to the cloud.', kind: 'warning' });
      return;
    }

    setIsUploading(true);
    const tempId = `temp_${Date.now()}`;
    const ext = file.name.split('.').pop().toLowerCase();
    let kind = 'img';
    if (ext === 'pdf') kind = 'pdf';
    else if (['mp3','wav','ogg'].includes(ext)) kind = 'audio';
    else if (['xls','xlsx','csv'].includes(ext)) kind = 'sheet';
    else if (['fig'].includes(ext)) kind = 'fig';

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    actions.addFile({ id: tempId, name: file.name, from: 'This device', to: 'Cloud', size: fileSizeMB, kind, progress: 0 });
    actions.addNotification({ text: `Uploading: "${file.name}"`, kind: 'info' });

    // Upload to Supabase Storage
    const result = await uploadFile(file, authUser.id);
    
    if (result.ok) {
      actions.removeFile(tempId);
      actions.addFile({
        name: file.name,
        url: result.url,
        path: result.path,
        from: 'This device',
        to: 'Cloud',
        size: fileSizeMB,
        kind,
        progress: 100
      });
      actions.addNotification({ text: `Upload complete!`, kind: 'success' });
    } else {
      actions.removeFile(tempId);
      actions.addNotification({ text: `Upload failed: ${result.error}`, kind: 'error' });
    }
    
    setIsUploading(false);
    setShowAdd(false);
  };

  const handleRemove = async (file) => {
    actions.removeFile(file.id);
    if (file.path) {
      await deleteFile(file.path);
    }
  };

  const attachToCalendar = () => {
    const memo = files.find(f => f.name.toLowerCase().includes('memo') || f.kind === 'pdf');
    if (memo) {
      const now = new Date();
      const target = state.events?.find(e => e.time === '14:30' || /bessemer|memo|follow/i.test(e.title || ''));
      if (target) {
        actions.updateEvent({ ...target, attachment: memo.id || memo.name, attachmentName: memo.name });
      } else {
        actions.addEvent({
          title: 'Review attached memo',
          day: now.getDate(),
          month: now.getMonth(),
          year: now.getFullYear(),
          time: '14:30',
          color: 'orange',
          attachment: memo.id || memo.name,
          attachmentName: memo.name,
        });
      }
      actions.addNotification({ text: `"${memo.name}" attached to the 14:30 calendar block`, kind: 'info' });
    } else {
      actions.addNotification({ text: `No memo file found to attach`, kind: 'info' });
    }
  };

  return (
    <ScreenShell
      eyebrow="Cross-device sync"
      title={<>Beam <span className="t-display-italic" style={{ color: "var(--accent-orange)" }}>anything</span>, anywhere.</>}
      subtitle={<>Drag a file onto any device tile. Real-time sync across your fleet. Lightweight, encrypted, peer-to-peer when possible.</>}
      right={<PaperButton icon="plus" primary onClick={() => setShowAdd(true)}>New transfer</PaperButton>}
    >
      {showAdd && (
        <GlassCard style={{ marginBottom: 16, padding: 0 }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 14, color: "var(--ink-2)" }}>
              {isUploading ? "Uploading to Supabase..." : "Select a file to upload to the Cloud"}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileSelect} 
            />
            
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <PaperButton small onClick={() => setShowAdd(false)} disabled={isUploading}>Cancel</PaperButton>
              <PaperButton small primary onClick={() => fileInputRef.current?.click()} disabled={isUploading} icon="arrow">
                {isUploading ? "Uploading..." : "Choose File"}
              </PaperButton>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard strong padding={0} style={{ overflow: "hidden", marginBottom: 16 }}>
        <div style={{ position: "relative", height: 360, padding: 24 }}>
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)", width: 96, height: 96,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #fff, #f5a524 30%, #e7402e 70%, #c2185b 100%)",
            boxShadow: "0 0 0 12px rgba(245,165,36,.08), 0 0 0 28px rgba(245,165,36,.04), 0 0 60px rgba(231,64,46,.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 500, letterSpacing: "0.02em",
          }}>Cloud</div>
          {[150, 220].map((r, i) => (
            <div key={i} style={{
              position: "absolute", left: "50%", top: "50%", width: r*2, height: r*2,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "0.5px dashed rgba(245,165,36,.25)",
            }}/>
          ))}
          {devices.map((d, i) => {
            const angle = (i / devices.length) * Math.PI * 2 - Math.PI/2;
            const r = 150;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            return (
              <div key={d.name} style={{
                position: "absolute", left: "50%", top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                width: 160,
              }}>
                <div style={{
                  padding: 14,
                  background: d.online ? "rgba(255,252,244,.85)" : "rgba(255,252,244,.45)",
                  backdropFilter: "blur(20px)",
                  border: `0.5px solid ${d.online ? "rgba(255,255,255,.85)" : "rgba(26,20,16,.10)"}`,
                  borderRadius: 14,
                  boxShadow: d.online ? "0 1px 0 rgba(255,255,255,.7) inset, 0 8px 20px -6px rgba(46,30,12,.20)" : "0 1px 0 rgba(255,255,255,.5) inset, 0 4px 10px -4px rgba(46,30,12,.10)",
                  opacity: d.online ? 1 : 0.55,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon name={d.kind} size={18} color={d.online ? "var(--ink-1)" : "var(--ink-4)"} />
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-1)" }}>{d.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 10.5, color: "var(--ink-3)" }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: 999,
                      background: d.online ? "var(--ok)" : "var(--ink-4)",
                      boxShadow: d.online ? "0 0 6px rgba(74,143,94,.6)" : "none",
                    }}/>
                    {d.online ? (d.here ? "This device" : "Online") : "Offline"}
                    {d.battery !== null && <span style={{ marginLeft: "auto" }} className="t-mono">{d.battery}%</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <GlassCard>
          <div className="t-cap">Active transfers · {files.filter(f => f.progress < 100).length} in flight</div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
            {files.map((f) => (
              <div key={f.id} style={{
                display: "grid", gridTemplateColumns: "36px 1fr auto 60px auto", gap: 14, alignItems: "center",
                padding: "10px 0", borderBottom: f.id !== files[files.length - 1].id ? "0.5px solid var(--ink-line)" : "none",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(26,20,16,.04)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: f.kind === "img" ? "var(--accent-amber)" : f.kind === "audio" ? "var(--accent-coral)" : f.kind === "pdf" ? "var(--accent-orange)" : "var(--ink-2)",
                }}>
                  <Icon name={f.kind} size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4, fontSize: 11, color: "var(--ink-3)" }}>
                    <span>{f.from}</span>
                    <Icon name="arrow" size={11} />
                    <span>{f.to}</span>
                    <span>·</span>
                    <span>{f.size}</span>
                  </div>
                </div>
                <div style={{ width: 120 }}>
                  {f.progress < 100 ? (
                    <div style={{ height: 4, borderRadius: 999, background: "rgba(26,20,16,.06)", overflow: "hidden" }}>
                      <div style={{ width: `${f.progress}%`, height: "100%", background: "linear-gradient(90deg, var(--accent-amber), var(--accent-orange))" }}/>
                    </div>
                  ) : (
                    <span className="chip" style={{ color: "var(--ok)" }}>
                      <Icon name="check" size={11} />Delivered
                    </span>
                  )}
                </div>
                <span className="t-mono" style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>{f.progress}%</span>
                <button onClick={() => handleRemove(f)} aria-label={`Remove ${f.name}`} style={{ fontSize: 10, color: "var(--ink-4)", padding: "2px 6px" }}>✕</button>
              </div>
            ))}
            {files.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>No files uploaded yet. Click "New transfer" to upload to Supabase.</div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AiOrb size={20} />
            <div className="t-cap" style={{ color: "var(--accent-orange)" }}>AI · file noticed</div>
          </div>
          <div className="t-display-italic" style={{ fontSize: 19, marginTop: 10, lineHeight: 1.35 }}>
            "I see <strong>Bessemer-memo-v3.pdf</strong> just landed on your phone. Want me to attach it to the 14:30 calendar block automatically?"
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <PaperButton small onClick={() => actions.addNotification({ text: 'Skipped attachment', kind: 'info' })}>Not now</PaperButton>
            <PaperButton small primary onClick={attachToCalendar}>Yes, attach</PaperButton>
          </div>
          <div className="hair" style={{ margin: "16px 0" }}/>
          <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
            Sync status — peer-to-peer over LAN when devices are co-located, end-to-end
            encrypted otherwise. Average transfer ~140Mbps over Halcyon HQ wifi.
          </div>
        </GlassCard>
      </div>
    </ScreenShell>
  );
};
