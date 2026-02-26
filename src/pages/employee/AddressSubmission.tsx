import React, { useState, useCallback, useRef } from 'react';
import { employeeService, SubmitInspectionRequest } from '@/services/employeeService';
import { ApiError } from '@/services/apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// AddressSubmission.tsx — Version 2.1
//
// Section E: Verification window is now LOCKED to 10:00 PM – 4:00 AM.
// The backend enforces the same rule; the frontend prevents any other value
// from being selected.
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

interface ImageSlot {
  id: 'frontView' | 'gateView' | 'streetView';
  label: string;
  description: string;
  required: boolean | 'conditional';
}

interface FormState {
  fullAddress: string;
  landmark: string;
  city: string;
  lga: string;
  state: string;
  buildingType: string;
  buildingPurpose: string;
  buildingStatus: string;
  buildingColour: string;
  hasFence: boolean;
  hasGate: boolean;
  occupants: string;
  relationship: string;
  notes: string;
  windowStart: string;
  windowEnd: string;
}

interface ImageState {
  frontView: File | null;
  gateView: File | null;
  streetView: File | null;
  additionalImages: File[];
}

interface ImagePreview {
  frontView: string | null;
  gateView: string | null;
  streetView: string | null;
  additionalImages: string[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const BUILDING_TYPES = ['Duplex', 'Bungalow', 'Apartment', 'Detached House', 'Semi-Detached', 'Other'];
const BUILDING_PURPOSES = ['Residential', 'Commercial', 'Mixed Use'];
const BUILDING_STATUSES = ['Completed', 'Completed and Painted', 'Under Construction', 'Renovated'];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const IMAGE_SLOTS: ImageSlot[] = [
  { id: 'frontView',  label: 'Front View',        description: 'Clear photo of the building front entrance',   required: true },
  { id: 'streetView', label: 'Street View',        description: 'Photo showing the building from the street',   required: true },
  { id: 'gateView',   label: 'Gate / Fence View',  description: 'Required if property has a gate or fence',     required: 'conditional' },
];

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE  = 5 * 1024 * 1024; // 5 MB

// ── Verification Window: 10 PM → 4 AM (30-min increments) ────────────────────
// These are the ONLY valid values the backend will accept.
// Stored as "HH:MM" (24-hour); displayed as "10:00 PM", "12:00 AM", etc.

interface TimeSlot { value: string; label: string; }

const WINDOW_SLOTS: TimeSlot[] = [
  { value: '22:00', label: '10:00 PM' },
  { value: '22:30', label: '10:30 PM' },
  { value: '23:00', label: '11:00 PM' },
  { value: '23:30', label: '11:30 PM' },
  { value: '00:00', label: '12:00 AM (midnight)' },
  { value: '00:30', label: '12:30 AM' },
  { value: '01:00', label: '1:00 AM' },
  { value: '01:30', label: '1:30 AM' },
  { value: '02:00', label: '2:00 AM' },
  { value: '02:30', label: '2:30 AM' },
  { value: '03:00', label: '3:00 AM' },
  { value: '03:30', label: '3:30 AM' },
  { value: '04:00', label: '4:00 AM' },
];

/**
 * Returns only the end-time slots that are strictly AFTER the chosen start.
 * If no start is selected, no end slots are enabled.
 */
const getEndSlots = (startValue: string): TimeSlot[] => {
  const startIdx = WINDOW_SLOTS.findIndex(s => s.value === startValue);
  if (startIdx === -1) return [];
  return WINDOW_SLOTS.slice(startIdx + 1);
};

const INITIAL_FORM: FormState = {
  fullAddress: '', landmark: '', city: '', lga: '', state: '',
  buildingType: '', buildingPurpose: '', buildingStatus: '', buildingColour: '',
  hasFence: false, hasGate: false,
  occupants: '', relationship: '', notes: '',
  windowStart: '', windowEnd: '',
};

const INITIAL_IMAGES: ImageState  = { frontView: null, gateView: null, streetView: null, additionalImages: [] };
const INITIAL_PREVIEWS: ImagePreview = { frontView: null, gateView: null, streetView: null, additionalImages: [] };

// ── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ step: string; title: string; subtitle: string }> = ({ step, title, subtitle }) => (
  <div className="flex items-start gap-4 mb-6">
    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
      <span className="text-sm font-bold text-white">{step}</span>
    </div>
    <div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  </div>
);

const Field: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode; hint?: string }> =
  ({ label, required, error, children, hint }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {hint  && !error && <p className="text-xs text-gray-500">{hint}</p>}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

const Toggle: React.FC<{ label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }> =
  ({ label, description, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-150 ${
      checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
    }`}
  >
    <div className="text-left">
      <div className="text-sm font-medium text-gray-800">{label}</div>
      {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
    </div>
    <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </div>
  </button>
);

// ── Image Drop Zone ───────────────────────────────────────────────────────────

interface ImageDropZoneProps {
  slot: ImageSlot; file: File | null; preview: string | null;
  isConditionalRequired: boolean; dragActive: boolean;
  onDragEnter: (e: React.DragEvent) => void; onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void; onFileSelect: (file: File, id: string) => void;
  onRemove: (id: string) => void; error?: string;
}

const ImageDropZone: React.FC<ImageDropZoneProps> = ({
  slot, file, preview, isConditionalRequired, dragActive,
  onDragEnter, onDragLeave, onDrop, onFileSelect, onRemove, error,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isRequired = slot.required === true || (slot.required === 'conditional' && isConditionalRequired);

  if (preview && file) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {slot.label}{isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          <button type="button" onClick={() => onRemove(slot.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
        </div>
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img src={preview} alt={slot.label} className="w-full h-48 object-cover" />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <p className="text-white text-xs font-medium truncate">{file.name}</p>
            <p className="text-white/70 text-xs">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {slot.label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
        {slot.required === 'conditional' && !isConditionalRequired && (
          <span className="text-gray-400 font-normal ml-1">(if applicable)</span>
        )}
      </label>
      <div
        onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDragOver={e => e.preventDefault()}
        onDrop={e => onDrop(e, slot.id)} onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-150 ${
          dragActive ? 'border-blue-500 bg-blue-50' : error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
        }`}
      >
        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')}
          onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f, slot.id); e.target.value = ''; }}
          className="hidden" />
        <div className="text-center px-4">
          <div className="mb-2">
            <svg className={`mx-auto w-8 h-8 ${error ? 'text-red-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">Drag photo here or <span className="text-blue-600">click to browse</span></p>
          <p className="text-xs text-gray-400 mt-1">{slot.description}</p>
          <p className="text-xs text-gray-400">JPG, PNG, WebP · Max 5MB</p>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

// ── Additional Images ─────────────────────────────────────────────────────────

const AdditionalImages: React.FC<{ files: File[]; previews: string[]; onAdd: (files: File[]) => void; onRemove: (i: number) => void }> =
  ({ files, previews, onAdd, onRemove }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = 5 - files.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Additional Photos <span className="text-gray-400 font-normal">(optional)</span></label>
        <span className="text-xs text-gray-500">{files.length} / 5</span>
      </div>
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden aspect-square">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => onRemove(i)}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      {remaining > 0 && (
        <button type="button" onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add more photos ({remaining} remaining)
        </button>
      )}
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} multiple
        onChange={e => { onAdd(Array.from(e.target.files || [])); e.target.value = ''; }}
        className="hidden" />
    </div>
  );
};

// ── Time Slot Select ──────────────────────────────────────────────────────────
// A locked dropdown that only shows times within the 10 PM – 4 AM window.

interface TimeSelectProps {
  label: string;
  value: string;
  slots: TimeSlot[];
  placeholder: string;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
}

const TimeSelect: React.FC<TimeSelectProps> = ({ label, value, slots, placeholder, disabled, error, onChange }) => (
  <Field label={label} required error={error}>
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full rounded-lg border px-3.5 py-2.5 text-sm appearance-none
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
          ${!disabled && error ? 'border-red-400 bg-red-50 text-gray-900' : ''}
          ${!disabled && !error ? 'border-gray-300 bg-white text-gray-900' : ''}
          ${!value ? 'text-gray-400' : 'text-gray-900'}
        `}
      >
        <option value="" disabled>{placeholder}</option>
        {slots.map(slot => (
          <option key={slot.value} value={slot.value}>{slot.label}</option>
        ))}
      </select>
      {/* Chevron icon */}
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </Field>
);

// ── Main Component ────────────────────────────────────────────────────────────

const AddressSubmission: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [form, setForm]       = useState<FormState>(INITIAL_FORM);
  const [images, setImages]   = useState<ImageState>(INITIAL_IMAGES);
  const [previews, setPreviews] = useState<ImagePreview>(INITIAL_PREVIEWS);
  const [activeDrag, setActiveDrag]   = useState<string | null>(null);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess]       = useState(false);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  }, []);

  // When start changes, clear end if it's no longer valid
  const handleWindowStartChange = (value: string) => {
    setField('windowStart', value);
    const validEnds = getEndSlots(value).map(s => s.value);
    if (form.windowEnd && !validEnds.includes(form.windowEnd)) {
      setField('windowEnd', '');
    }
  };

  // ── Image helpers ─────────────────────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Only JPG, PNG, and WebP files are accepted';
    if (file.size > MAX_FILE_SIZE) return 'File size must be under 5MB';
    return null;
  };

  const setSlotImage = useCallback((file: File, slotId: string) => {
    const err = validateFile(file);
    if (err) { setErrors(prev => ({ ...prev, [slotId]: err })); return; }
    const url = URL.createObjectURL(file);
    if (slotId === 'frontView' || slotId === 'gateView' || slotId === 'streetView') {
      setPreviews(prev => { if (prev[slotId]) URL.revokeObjectURL(prev[slotId]!); return { ...prev, [slotId]: url }; });
      setImages(prev => ({ ...prev, [slotId]: file }));
      setErrors(prev => { const n = { ...prev }; delete n[slotId]; return n; });
    }
  }, []);

  const removeSlotImage = useCallback((slotId: string) => {
    if (slotId === 'frontView' || slotId === 'gateView' || slotId === 'streetView') {
      setPreviews(prev => { if (prev[slotId]) URL.revokeObjectURL(prev[slotId]!); return { ...prev, [slotId]: null }; });
      setImages(prev => ({ ...prev, [slotId]: null }));
    }
  }, []);

  const addAdditionalImages = useCallback((newFiles: File[]) => {
    const valid = newFiles.filter(f => !validateFile(f));
    if (!valid.length) return;
    const urls = valid.map(f => URL.createObjectURL(f));
    setImages(prev => ({ ...prev, additionalImages: [...prev.additionalImages, ...valid].slice(0, 5) }));
    setPreviews(prev => ({ ...prev, additionalImages: [...prev.additionalImages, ...urls].slice(0, 5) }));
  }, []);

  const removeAdditionalImage = useCallback((index: number) => {
    setImages(prev => { const n = [...prev.additionalImages]; n.splice(index, 1); return { ...prev, additionalImages: n }; });
    setPreviews(prev => { const n = [...prev.additionalImages]; URL.revokeObjectURL(n[index]); n.splice(index, 1); return { ...prev, additionalImages: n }; });
  }, []);

  const handleDragEnter  = useCallback((e: React.DragEvent, id: string) => { e.preventDefault(); setActiveDrag(id); }, []);
  const handleDragLeave  = useCallback((e: React.DragEvent) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setActiveDrag(null); }, []);
  const handleDrop       = useCallback((e: React.DragEvent, id: string) => { e.preventDefault(); setActiveDrag(null); const f = e.dataTransfer.files?.[0]; if (f) setSlotImage(f, id); }, [setSlotImage]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.fullAddress.trim()) errs.fullAddress = 'Full address is required';
    if (!form.city.trim())        errs.city = 'City is required';
    if (!form.state)              errs.state = 'State is required';
    if (!form.buildingType)       errs.buildingType = 'Building type is required';
    if (!form.buildingPurpose)    errs.buildingPurpose = 'Building purpose is required';
    if (!form.buildingStatus)     errs.buildingStatus = 'Building status is required';
    if (!form.occupants.trim())   errs.occupants = 'Occupancy information is required';
    if (!images.frontView)        errs.frontView = 'Front view photo is required';
    if (!images.streetView)       errs.streetView = 'Street view photo is required';
    if ((form.hasFence || form.hasGate) && !images.gateView) {
      errs.gateView = 'Gate/fence photo is required when property has a gate or fence';
    }

    if (!form.windowStart) {
      errs.windowStart = 'Please select a start time';
    }
    if (!form.windowEnd) {
      errs.windowEnd = form.windowStart ? 'Please select an end time' : 'Select a start time first';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) { document.querySelector('[data-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }

    setIsSubmitting(true);
    try {
      await employeeService.submitInspection({
        ...form,
        frontView:        images.frontView!,
        streetView:       images.streetView!,
        gateView:         images.gateView,
        additionalImages: images.additionalImages,
      } as SubmitInspectionRequest);
      setIsSuccess(true);
      onSuccess?.();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (isSuccess) {
    const startLabel = WINDOW_SLOTS.find(s => s.value === form.windowStart)?.label || form.windowStart;
    const endLabel   = WINDOW_SLOTS.find(s => s.value === form.windowEnd)?.label   || form.windowEnd;
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Inspection Submitted</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          Your inspection details and photos have been submitted successfully.
          Please confirm your location during your scheduled verification window.
        </p>
        <div className="mt-6 text-sm text-blue-600 font-medium">
          Window: {startLabel} — {endLabel}
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const endSlots = getEndSlots(form.windowStart);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Address Inspection</h1>
        <p className="text-sm text-gray-500 mt-1">Complete all sections and upload the required photos to submit your inspection.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-8">

        {/* ── SECTION A ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader step="A" title="Address Details" subtitle="Enter the full address of the property being inspected" />
          <div className="space-y-4">
            <Field label="Full Address" required error={errors.fullAddress}>
              <textarea value={form.fullAddress} onChange={e => setField('fullAddress', e.target.value)} rows={3}
                placeholder="e.g. No. 12 Adeola Odeku Street, Victoria Island"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.fullAddress ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`}
                data-error={errors.fullAddress ? true : undefined} />
            </Field>
            <Field label="Landmark" hint="Nearest notable landmark">
              <input type="text" value={form.landmark} onChange={e => setField('landmark', e.target.value)}
                placeholder="e.g. Opposite First Bank"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" required error={errors.city}>
                <input type="text" value={form.city} onChange={e => setField('city', e.target.value)} placeholder="e.g. Lagos"
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.city ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`} />
              </Field>
              <Field label="LGA" hint="Local Government Area">
                <input type="text" value={form.lga} onChange={e => setField('lga', e.target.value)} placeholder="e.g. Eti-Osa"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </Field>
            </div>
            <Field label="State" required error={errors.state}>
              <select value={form.state} onChange={e => setField('state', e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.state ? 'border-red-400 bg-red-50 text-gray-900' : 'border-gray-300 bg-white'} ${!form.state ? 'text-gray-400' : 'text-gray-900'}`}>
                <option value="">Select state…</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* ── SECTION B ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader step="B" title="Property Details" subtitle="Describe the physical characteristics of the building" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Building Type" required error={errors.buildingType}>
                <select value={form.buildingType} onChange={e => setField('buildingType', e.target.value)}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.buildingType ? 'border-red-400 bg-red-50 text-gray-900' : 'border-gray-300 bg-white'} ${!form.buildingType ? 'text-gray-400' : 'text-gray-900'}`}>
                  <option value="">Select type…</option>
                  {BUILDING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Purpose" required error={errors.buildingPurpose}>
                <select value={form.buildingPurpose} onChange={e => setField('buildingPurpose', e.target.value)}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.buildingPurpose ? 'border-red-400 bg-red-50 text-gray-900' : 'border-gray-300 bg-white'} ${!form.buildingPurpose ? 'text-gray-400' : 'text-gray-900'}`}>
                  <option value="">Select purpose…</option>
                  {BUILDING_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Building Status" required error={errors.buildingStatus}>
              <div className="grid grid-cols-2 gap-2">
                {BUILDING_STATUSES.map(s => (
                  <button key={s} type="button" onClick={() => setField('buildingStatus', s)}
                    className={`px-4 py-2.5 rounded-lg text-sm border transition-all duration-100 text-left ${form.buildingStatus === s ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
              {errors.buildingStatus && <p className="text-xs text-red-600 mt-1">{errors.buildingStatus}</p>}
            </Field>
            <Field label="Building Colour" hint="e.g. White, Cream, Brown, Grey">
              <input type="text" value={form.buildingColour} onChange={e => setField('buildingColour', e.target.value)}
                placeholder="e.g. Cream with brown trimmings"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Toggle label="Has a Fence" description="Property is surrounded by a fence" checked={form.hasFence} onChange={v => setField('hasFence', v)} />
              <Toggle label="Has a Gate"  description="Property has a gate or entry barrier" checked={form.hasGate}  onChange={v => setField('hasGate', v)} />
            </div>
          </div>
        </div>

        {/* ── SECTION C ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader step="C" title="Occupancy Details" subtitle="Provide information about who occupies the property" />
          <div className="space-y-4">
            <Field label="Who lives at this address?" required error={errors.occupants}>
              <input type="text" value={form.occupants} onChange={e => setField('occupants', e.target.value)}
                placeholder="e.g. Myself, spouse, and two children"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.occupants ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}`} />
            </Field>
            <Field label="Your relationship to the address" hint="e.g. Owner, Tenant, Family member">
              <input type="text" value={form.relationship} onChange={e => setField('relationship', e.target.value)}
                placeholder="e.g. Tenant"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
            <Field label="Additional notes" hint="Any other relevant details about this address">
              <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={3}
                placeholder="e.g. Building is at the back of the compound, use the second gate"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </Field>
          </div>
        </div>

        {/* ── SECTION D ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader step="D" title="Property Photos" subtitle="Upload clear photos of the property — well-lit, unblurred" />
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {IMAGE_SLOTS.map(slot => (
                <ImageDropZone key={slot.id} slot={slot} file={images[slot.id]} preview={previews[slot.id]}
                  isConditionalRequired={form.hasFence || form.hasGate} dragActive={activeDrag === slot.id}
                  onDragEnter={e => handleDragEnter(e, slot.id)} onDragLeave={handleDragLeave}
                  onDrop={handleDrop} onFileSelect={setSlotImage} onRemove={removeSlotImage} error={errors[slot.id]} />
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <AdditionalImages files={images.additionalImages} previews={previews.additionalImages}
                onAdd={addAdditionalImages} onRemove={removeAdditionalImage} />
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs text-amber-800 font-medium mb-1">Photo requirements</p>
              <ul className="text-xs text-amber-700 space-y-0.5">
                <li>• Photos must be taken in good lighting (daytime preferred)</li>
                <li>• Building must be clearly visible and in focus</li>
                <li>• Do not crop out the building entrance or gate</li>
                <li>• Minimum resolution: 640×480px</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── SECTION E: Verification Window (locked to 10 PM – 4 AM) ─── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <SectionHeader step="E" title="Verification Window"
            subtitle="Select the time window when you will be physically present at this address" />

          {/* Constraint notice */}
          <div className="mb-5 rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-start gap-3">
            <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-indigo-800">Verification hours: 10:00 PM – 4:00 AM only</p>
              <p className="text-xs text-indigo-700 mt-0.5">
                Address verification is conducted overnight. Select a start and end time within this window.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start time */}
            <TimeSelect
              label="From"
              value={form.windowStart}
              slots={WINDOW_SLOTS}
              placeholder="Select start…"
              error={errors.windowStart}
              onChange={handleWindowStartChange}
            />

            {/* End time — disabled until a start is chosen */}
            <TimeSelect
              label="To"
              value={form.windowEnd}
              slots={endSlots}
              placeholder={form.windowStart ? 'Select end…' : 'Choose start first'}
              disabled={!form.windowStart}
              error={errors.windowEnd}
              onChange={v => setField('windowEnd', v)}
            />
          </div>

          {/* Live summary */}
          {form.windowStart && form.windowEnd && (
            <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-xs text-green-800">
                <span className="font-semibold">Your window: </span>
                {WINDOW_SLOTS.find(s => s.value === form.windowStart)?.label} –{' '}
                {WINDOW_SLOTS.find(s => s.value === form.windowEnd)?.label}
              </p>
            </div>
          )}

          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-xs text-blue-800">
              <strong>Important:</strong> You will need to confirm your GPS location during this window.
              Make sure you are physically at the submitted address at that time.
            </p>
          </div>
        </div>

        {/* ── Submit ───────────────────────────────────────────────────── */}
        {submitError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {Object.keys(errors).length > 0 && !submitError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700 font-medium">Please fix the errors above before submitting.</p>
          </div>
        )}

        <button type="submit" disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150">
          {isSubmitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading photos and submitting…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Submit Inspection
            </>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          By submitting you confirm this information is accurate and that photos were taken at the stated address.
        </p>
      </form>
    </div>
  );
};

export default AddressSubmission;