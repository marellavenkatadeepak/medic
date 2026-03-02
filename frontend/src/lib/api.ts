/**
 * api.ts — Centralized backend API client for MediChain AI frontend.
 *
 * All calls go through the FastAPI backend (NEXT_PUBLIC_API_URL).
 * No secrets, API keys, or service credentials are held here.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnalyzeReportPayload {
    file_base64: string;
    file_type: string;
    patient_wallet: string;
    file_name: string;
}

export interface ChatPayload {
    patient_wallet: string;
    message: string;
}

export interface TavusVideoPayload {
    summary: string;
    risk_score: number;
    conditions?: string[];
    specialist?: string;
    urgency?: string;
}

export interface OrganAnalysisPayload {
    organName: string;
    analysisText: Record<string, unknown>;
}

export interface DoctorProfilePayload {
    name: string;
    specialty: string;
    bio: string;
}

export interface ConsultationNotePayload {
    patient_wallet: string;
    analysis_id: string;
    note: string;
}

export interface CreateAppointmentPayload {
    patient_wallet: string;
    doctor_wallet: string;
    date: string;
    time: string;
    reason: string;
}

export interface UpdateRecordPayload {
    tx_hash?: string;
    record_id?: number;
    file_url?: string;
    ipfs_cid?: string;
    file_fingerprint?: string;
    encryption_iv?: string;
    organ_data?: Record<string, any>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
    let res;
    try {
        res = await fetch(`${API_URL}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch (err: any) {
        throw new Error(`Connection failed: Could not reach backend at ${API_URL}`);
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `Request failed: ${res.status}`);
    }
    return res.json();
}

async function get<T>(path: string): Promise<T> {
    let res;
    try {
        res = await fetch(`${API_URL}${path}`);
    } catch (err: any) {
        throw new Error(`Connection failed: Could not reach backend at ${API_URL}`);
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `Request failed: ${res.status}`);
    }
    return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
    let res;
    try {
        res = await fetch(`${API_URL}${path}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch (err: any) {
        throw new Error(`Connection failed: Could not reach backend at ${API_URL}`);
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `Request failed: ${res.status}`);
    }
    return res.json();
}

async function del<T>(path: string): Promise<T> {
    let res;
    try {
        res = await fetch(`${API_URL}${path}`, { method: "DELETE" });
    } catch (err: any) {
        throw new Error(`Connection failed: Could not reach backend at ${API_URL}`);
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail || `Request failed: ${res.status}`);
    }
    return res.json();
}

// ─── AI / Analysis ───────────────────────────────────────────────────────────

/** Upload and analyze a medical report (PDF/Image). */
export const analyzeReport = (payload: AnalyzeReportPayload) =>
    post("/api/analyze-report", payload);

/** Send a chat message to the AI health assistant. */
export const sendChatMessage = (payload: ChatPayload) =>
    post("/api/chat", payload);

/** Generate a Tavus AI doctor video for a medical analysis. */
export const generateTavusVideo = (payload: TavusVideoPayload) =>
    post("/api/tavus-video", payload);

/** Check the status of a Tavus video by its ID. */
export const getTavusVideoStatus = (videoId: string) =>
    get(`/api/tavus-video?video_id=${encodeURIComponent(videoId)}`);

/** Get AI analysis for a specific organ based on report data. */
export const analyzeOrgan = (payload: OrganAnalysisPayload) =>
    post<{ organAnalysis: any }>("/api/analyze-organ", payload);

// ─── Records ─────────────────────────────────────────────────────────────────

/** Fetch all medical analysis records for a patient wallet. */
export const getPatientRecords = (wallet: string) =>
    get<{ success: boolean; records: any[] }>(`/api/records/${encodeURIComponent(wallet)}`);

/** Delete an analysis record by ID. */
export const deleteRecord = (id: string) =>
    del<{ success: boolean }>(`/api/records/${encodeURIComponent(id)}`);

/** Patch an analysis record (tx_hash, IPFS fields, etc.). */
export const updateRecord = (id: string, payload: UpdateRecordPayload) =>
    patch<{ success: boolean; record: any }>(`/api/records/${encodeURIComponent(id)}`, payload);

/** Check if a record with the same file name already exists (cache check). */
export const checkRecordCache = (patient_wallet: string, file_name: string) =>
    post<{ exists: boolean; record: any | null }>("/api/records/check-cache", { patient_wallet, file_name });

/** Clone an existing record row (for cached re-uploads). */
export const cloneRecord = (payload: Record<string, any>) =>
    post<{ success: boolean; record: any }>("/api/records/clone", payload);

// ─── Appointments ─────────────────────────────────────────────────────────────

/** Fetch all appointments for a patient wallet (enriched with doctor info). */
export const getAppointments = (wallet: string) =>
    get<{ success: boolean; appointments: any[] }>(`/api/appointments/${encodeURIComponent(wallet)}`);

/** Cancel an appointment by ID. */
export const cancelAppointment = (id: string) =>
    patch<{ success: boolean }>(`/api/appointments/${encodeURIComponent(id)}/cancel`, {});

/** Get booked slots for a specific doctor on a given date. */
export const getBookedSlots = (doctorWallet: string, date: string) =>
    get<{ success: boolean; booked_slots: string[] }>(`/api/appointments/slots/${encodeURIComponent(doctorWallet)}/${encodeURIComponent(date)}`);

/** Create a new appointment request. */
export const createAppointment = (payload: CreateAppointmentPayload) =>
    post<{ success: boolean }>(`/api/appointments`, payload);

// ─── Doctor Dashboard ───────────────────────────────────────────────────────

/** Get list of all doctors, optionally filtered by specialty. */
export const getAllDoctors = (specialty?: string) => {
    const query = specialty ? `?specialty=${encodeURIComponent(specialty)}` : "";
    return get<{ success: boolean; doctors: any[] }>(`/api/doctors${query}`);
}

export const getDoctorProfile = (wallet: string) =>
    get<{ success: boolean; profiles: any[] }>(`/api/doctor/profile/${encodeURIComponent(wallet)}`);

export const upsertDoctorProfile = (wallet: string, payload: DoctorProfilePayload) =>
    post<{ success: boolean }>(`/api/doctor/profile/${encodeURIComponent(wallet)}`, payload);

export const getDoctorGrants = (wallet: string) =>
    get<{ success: boolean; grants: any[] }>(`/api/doctor/grants/${encodeURIComponent(wallet)}`);

export const getDoctorAppointments = (wallet: string) =>
    get<{ success: boolean; appointments: any[] }>(`/api/doctor/appointments/${encodeURIComponent(wallet)}`);

export const updateDoctorAppointmentStatus = (id: string, status: string) =>
    patch<{ success: boolean }>(`/api/doctor/appointments/${encodeURIComponent(id)}`, { status });

export const getConsultationNotes = (doctorWallet: string, patientWallet: string) =>
    get<{ success: boolean; notes: any[] }>(`/api/doctor/notes/${encodeURIComponent(doctorWallet)}/${encodeURIComponent(patientWallet)}`);

export const addConsultationNote = (doctorWallet: string, payload: ConsultationNotePayload) =>
    post<{ success: boolean }>(`/api/doctor/notes/${encodeURIComponent(doctorWallet)}`, payload);

// ─── Access Grants ───────────────────────────────────────────────────────────

export const getAccessGrants = (analysisId: string) =>
    get<{ success: boolean; grants: any[] }>(`/api/access-grants/analysis/${encodeURIComponent(analysisId)}`);

export const apiGrantAccess = (payload: { patient_wallet: string; doctor_wallet: string; analysis_id: string }) =>
    post<{ success: boolean }>(`/api/access-grants`, payload);

export const apiRevokeAccess = (payload: { doctor_wallet: string; analysis_id: string }) =>
    patch<{ success: boolean }>(`/api/access-grants/revoke`, payload);

