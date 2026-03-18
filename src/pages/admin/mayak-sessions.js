"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";

const AUTH_KEY = "mayak_content_admin_auth";

function LoginForm({ onLogin }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        try {
            const res = await fetch("/api/admin/mayak-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const json = await res.json();
            if (!json.success) {
                setError(json.error || "Неверный пароль");
                setPassword("");
                return;
            }
            sessionStorage.setItem(AUTH_KEY, "true");
            onLogin();
        } catch {
            setError("Ошибка входа");
        }
    };

    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, width: 320, padding: 32, border: "1px solid #ddd", borderRadius: 12 }}>
                <h2 style={{ margin: 0, textAlign: "center" }}>Сессии МАЯК</h2>
                <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
                {error && <div style={{ color: "#e53e3e", fontSize: 13 }}>{error}</div>}
                <button type="submit" style={primaryButtonStyle}>
                    Войти
                </button>
            </form>
        </div>
    );
}

function SessionForm({ ranges, value, onChange, onSubmit, submitting, submitLabel, isEditing }) {
    const selectedRange = ranges.find((range) => (range.sectionId || range.range) === value.sectionId) || null;

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit();
            }}
            style={panelStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Название сессии</label>
                    <input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Например, Весенняя сессия 10А" style={inputStyle} />
                </div>
                <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Раздел / колода</label>
                    <select
                        value={value.sectionId}
                        onChange={(e) => {
                            const sectionId = e.target.value;
                            const range = ranges.find((item) => (item.sectionId || item.range) === sectionId) || null;
                            onChange({
                                ...value,
                                sectionId,
                                taskRange: range?.range || "",
                            });
                        }}
                        style={inputStyle}>
                        <option value="">Выберите раздел</option>
                        {ranges.map((range) => {
                            const key = range.sectionId || range.range;
                            return (
                                <option key={key} value={key}>
                                    {key}
                                    {range.rangeName ? ` - ${range.rangeName}` : ""}
                                </option>
                            );
                        })}
                    </select>
                </div>
                <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Диапазон заданий</label>
                    <input value={selectedRange?.range || value.taskRange} readOnly style={{ ...inputStyle, background: "#f8fafc" }} />
                </div>
                <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Количество столов</label>
                    <input type="number" min="1" value={value.tableCount} onChange={(e) => onChange({ ...value, tableCount: e.target.value })} style={inputStyle} />
                </div>
                <div style={fieldGroupStyle}>
                    <label style={labelStyle}>Количество использований токена</label>
                    <input type="number" min="1" value={value.tokenUsageLimit} onChange={(e) => onChange({ ...value, tokenUsageLimit: e.target.value })} style={inputStyle} />
                </div>
                <div style={fieldGroupStyle}>
                    <label style={labelStyle}>{"\u0422\u0430\u0439\u043c\u0435\u0440 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438 (\u0441\u0435\u043a)"}</label>
                    <input type="number" min="1" value={value.reviewTimeoutSeconds} onChange={(e) => onChange({ ...value, reviewTimeoutSeconds: e.target.value })} style={inputStyle} />
                </div>
                <div style={fieldGroupStyle}>
                    <label style={labelStyle}>{"\u0422\u0430\u0439\u043c\u0435\u0440 \u0438\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f (\u0441\u0435\u043a)"}</label>
                    <input type="number" min="1" value={value.reworkTimeoutSeconds} onChange={(e) => onChange({ ...value, reworkTimeoutSeconds: e.target.value })} style={inputStyle} />
                </div>
            </div>

            <div style={{ marginTop: 16 }}>
                <div style={emptyHintStyle}>
                    {isEditing
                        ? "Токен этой сессии уже создан и сохранится при редактировании. Его лимит использований можно менять прямо здесь."
                        : "После нажатия «Создать сессию» session-токен будет создан автоматически. Затем его можно скопировать из карточки."}
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button type="submit" style={primaryButtonStyle} disabled={submitting}>
                    {submitting ? "..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

function SessionCard({ session, tokenMap, onEdit, onRemove, removingId, onCopyToken }) {
    const sessionTokens = (session.tokenIds || []).map((id) => tokenMap.get(id)).filter(Boolean);
    const primaryToken = sessionTokens[0] || null;

    return (
        <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>{session.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {session.sectionId} · {session.taskRange}
                    </div>
                </div>
                <span style={{ ...statusBadgeStyle, background: "#dcfce7", color: "#166534" }}>Активна</span>
            </div>

            <div style={metaRowStyle}>
                <span>{"\u0421\u0442\u043e\u043b\u044b"}: <b>{session.tableCount}</b></span>
                <span>{"\u0422\u043e\u043a\u0435\u043d\u043e\u0432"}: <b>{session.tokenIds?.length || 0}</b></span>
                <span>{"\u0418\u0441\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u043d\u0438\u0439 \u0442\u043e\u043a\u0435\u043d\u0430"}: <b>{session.tokenUsageLimit || primaryToken?.usageLimit || 0}</b></span>
                <span>{"\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430"}: <b>{session.reviewTimeoutSeconds || 130} {"\u0441\u0435\u043a"}</b></span>
                <span>{"\u0418\u0441\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435"}: <b>{session.reworkTimeoutSeconds || 180} {"\u0441\u0435\u043a"}</b></span>
                <span>{"\u0421\u043e\u0437\u0434\u0430\u043d\u0430"}: <b>{formatDate(session.createdAt)}</b></span>
            </div>

            {primaryToken && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={smallBadgeStyle}>{primaryToken.name}</span>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                        <code style={tokenValueStyle}>{primaryToken.token}</code>
                        <button type="button" style={secondaryButtonStyle} onClick={() => onCopyToken(primaryToken.token)}>
                            Копировать токен
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <button type="button" style={secondaryButtonStyle} onClick={() => onEdit(session)}>
                    Редактировать
                </button>
                <button type="button" style={dangerButtonStyle} onClick={() => onRemove(session)} disabled={removingId === session.id}>
                    {removingId === session.id ? "..." : "Завершить сессию"}
                </button>
            </div>
        </div>
    );
}

export default function AdminMayakSessions() {
    const [isAuth, setIsAuth] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [ranges, setRanges] = useState([]);
    const [tokens, setTokens] = useState([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [removingId, setRemovingId] = useState("");
    const [editingSessionId, setEditingSessionId] = useState("");
    const [form, setForm] = useState({
        name: "",
        sectionId: "",
        taskRange: "",
        tableCount: "1",
        tokenUsageLimit: "1",
        reviewTimeoutSeconds: "130",
        reworkTimeoutSeconds: "180",
    });

    const tokenMap = useMemo(() => new Map(tokens.map((token) => [token.id, token])), [tokens]);
    const activeSessions = sessions.filter((session) => session.status !== "completed");

    const resetForm = () => {
        setEditingSessionId("");
        setForm({
            name: "",
            sectionId: "",
            taskRange: "",
            tableCount: "1",
            tokenUsageLimit: "1",
            reviewTimeoutSeconds: "130",
            reworkTimeoutSeconds: "180",
        });
    };

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [sessionsRes, rangesRes, tokensRes] = await Promise.all([
                fetch("/api/admin/mayak-sessions"),
                fetch("/api/admin/mayak-content/ranges"),
                fetch("/api/admin/mayak-session-tokens"),
            ]);

            const sessionsJson = await sessionsRes.json();
            const rangesJson = await rangesRes.json();
            const tokensJson = await tokensRes.json();

            if (!sessionsJson.success) throw new Error(sessionsJson.error || "Не удалось загрузить сессии");
            if (!rangesJson.success) throw new Error(rangesJson.error || "Не удалось загрузить разделы");
            if (!tokensJson.success) throw new Error(tokensJson.error || "Не удалось загрузить session-токены");

            setSessions(Array.isArray(sessionsJson.data) ? sessionsJson.data : []);
            setRanges(Array.isArray(rangesJson.data) ? rangesJson.data : []);
            setTokens(Array.isArray(tokensJson.data) ? tokensJson.data : []);
            setError("");
        } catch (loadError) {
            setError(loadError.message || "Не удалось загрузить данные");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const saved = sessionStorage.getItem(AUTH_KEY);
        async function checkAuth() {
            try {
                const res = await fetch("/api/admin/mayak-auth");
                const json = await res.json();
                if (saved === "true" && json.authenticated) {
                    setIsAuth(true);
                } else {
                    sessionStorage.removeItem(AUTH_KEY);
                }
            } catch {}
            setLoading(false);
        }
        checkAuth();
    }, []);

    useEffect(() => {
        if (isAuth) {
            loadAll();
        }
    }, [isAuth, loadAll]);

    const handleSubmit = async () => {
        setSaving(true);
        setError("");
        setMessage("");

        try {
            const method = editingSessionId ? "PATCH" : "POST";
            const url = editingSessionId ? `/api/admin/mayak-sessions/${editingSessionId}` : "/api/admin/mayak-sessions";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Не удалось сохранить сессию");

            setMessage(editingSessionId ? "Сессия обновлена" : "Сессия создана, token сгенерирован автоматически");
            resetForm();
            await loadAll();
        } catch (submitError) {
            setError(submitError.message || "Не удалось сохранить сессию");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (session) => {
        setEditingSessionId(session.id);
        setForm({
            name: session.name || "",
            sectionId: session.sectionId || "",
            taskRange: session.taskRange || "",
            tableCount: String(session.tableCount || 1),
            tokenUsageLimit: String(session.tokenUsageLimit || tokenMap.get(session.tokenIds?.[0])?.usageLimit || 1),
            reviewTimeoutSeconds: String(session.reviewTimeoutSeconds || 130),
            reworkTimeoutSeconds: String(session.reworkTimeoutSeconds || 180),
        });
        setError("");
        setMessage("");
    };

    const handleCopyToken = async (tokenValue) => {
        try {
            await navigator.clipboard.writeText(tokenValue);
            setMessage("Session-токен скопирован");
            setError("");
        } catch {
            setError("Не удалось скопировать session-токен");
        }
    };

    const handleRemove = async (session) => {
        if (!window.confirm(`Завершить сессию "${session.name}"? Сессия будет полностью удалена вместе с token, файлами и runtime-данными.`)) {
            return;
        }

        setRemovingId(session.id);
        setError("");
        setMessage("");
        try {
            const res = await fetch(`/api/admin/mayak-sessions/${session.id}`, { method: "DELETE" });
            const json = await res.json();
            if (!json.success) throw new Error(json.error || "Не удалось удалить сессию");
            if (editingSessionId === session.id) {
                resetForm();
            }
            setMessage(`Сессия "${session.name}" удалена`);
            await loadAll();
        } catch (removeError) {
            setError(removeError.message || "Не удалось удалить сессию");
        } finally {
            setRemovingId("");
        }
    };

    if (!isAuth) {
        return (
            <>
                <Header />
                {!loading && <LoginForm onLogin={() => setIsAuth(true)} />}
            </>
        );
    }

    return (
        <>
            <Header />
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px 40px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <h1 style={{ fontSize: 24, margin: 0, color: "#0f172a" }}>Сессии MAYAK</h1>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Сессия создаётся в одном месте, её session-токен генерируется автоматически, а кнопка завершения теперь полностью удаляет сессию без истории.</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link href="/admin/mayak-content" style={navLinkStyle}>
                            Контент
                        </Link>
                        <Link href="/admin/mayak-tokens" style={navLinkStyle}>
                            Токены
                        </Link>
                    </div>
                </div>

                {error && <div style={{ ...noticeStyle, background: "#fef2f2", color: "#b91c1c", borderColor: "#fecaca" }}>{error}</div>}
                {message && <div style={{ ...noticeStyle, background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}>{message}</div>}

                <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>{editingSessionId ? "Редактирование сессии" : "Новая сессия"}</div>
                    <SessionForm
                        ranges={ranges}
                        value={form}
                        onChange={setForm}
                        onSubmit={handleSubmit}
                        submitting={saving}
                        submitLabel={editingSessionId ? "Сохранить сессию" : "Создать сессию"}
                        isEditing={Boolean(editingSessionId)}
                    />
                    {editingSessionId && (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                            <button type="button" style={secondaryButtonStyle} onClick={resetForm}>
                                Отменить редактирование
                            </button>
                        </div>
                    )}
                </div>

                <section>
                    <div style={sectionHeaderStyle}>
                        <h2 style={{ margin: 0, fontSize: 18 }}>Сессии</h2>
                        <span style={sectionCountStyle}>{activeSessions.length}</span>
                    </div>
                    {loading ? (
                        <div style={emptyHintStyle}>Загрузка...</div>
                    ) : activeSessions.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                            {activeSessions.map((session) => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    tokenMap={tokenMap}
                                    onEdit={handleEdit}
                                    onRemove={handleRemove}
                                    onCopyToken={handleCopyToken}
                                    removingId={removingId}
                                />
                            ))}
                        </div>
                    ) : (
                        <div style={emptyHintStyle}>Сессий пока нет.</div>
                    )}
                </section>
            </div>
        </>
    );
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("ru-RU");
}

const inputStyle = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
};

const panelStyle = {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#fff",
    padding: 16,
};

const fieldGroupStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
};

const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
};

const primaryButtonStyle = {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
};

const secondaryButtonStyle = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    fontWeight: 600,
    cursor: "pointer",
};

const dangerButtonStyle = {
    ...primaryButtonStyle,
    background: "#ef4444",
};

const cardStyle = {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#fff",
    padding: 16,
};

const navLinkStyle = {
    padding: "8px 14px",
    borderRadius: 8,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
};

const emptyHintStyle = {
    border: "1px dashed #cbd5e1",
    borderRadius: 12,
    padding: 16,
    color: "#64748b",
    background: "#f8fafc",
    fontSize: 13,
};

const sectionHeaderStyle = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
};

const sectionCountStyle = {
    minWidth: 24,
    height: 24,
    padding: "0 8px",
    borderRadius: 999,
    background: "#e2e8f0",
    color: "#334155",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
};

const statusBadgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
};

const smallBadgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 8px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#334155",
    fontSize: 12,
};

const tokenValueStyle = {
    display: "inline-flex",
    alignItems: "center",
    maxWidth: "100%",
    overflowWrap: "anywhere",
    padding: "8px 10px",
    borderRadius: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#0f172a",
    fontSize: 12,
};

const metaRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
    fontSize: 12,
    color: "#64748b",
};

const noticeStyle = {
    border: "1px solid transparent",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 16,
    fontSize: 13,
};

