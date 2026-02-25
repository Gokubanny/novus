import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Copy, Mail, Phone, MapPin, Clock, CheckCircle,
  AlertTriangle, RefreshCw, Loader2, AlertCircle, Map,
  ThumbsUp, ThumbsDown, Home, Building2, Users, ImageIcon,
  ChevronLeft, ChevronRight, X, ZoomIn
} from 'lucide-react';
import { useEmployeeById, useRequestReverification, useCompanySettings, useReviewVerification } from '@/hooks/useAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { formatDistance } from '@/lib/geocoding';
import VerificationMap from '@/components/admin/VerificationMap';

// ── Status badge ───────────────────────────────────────────────────────────
const getStatusBadge = (inviteStatus: string, verificationStatus?: string) => {
  if (inviteStatus === 'invited') {
    return <Badge variant="secondary" className="gap-1"><Mail className="h-3 w-3" /> Invited</Badge>;
  }
  switch (verificationStatus) {
    case 'verified':
      return <Badge className="gap-1 bg-success hover:bg-success/90"><CheckCircle className="h-3 w-3" /> Verified</Badge>;
    case 'pending_verification':
      return <Badge variant="outline" className="gap-1 text-warning border-warning"><Clock className="h-3 w-3" /> Pending Verification</Badge>;
    case 'pending_address':
      return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending Address</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Failed</Badge>;
    case 'reverification_required':
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Re-verify Required</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

// ── Internal flag badge (admin-only) ──────────────────────────────────────
const getInternalFlagBadge = (flag: { status: string; reason: string } | null) => {
  if (!flag?.status) return null;
  switch (flag.status) {
    case 'VERIFIED':
      return <Badge className="gap-1 bg-success/20 text-success border-success/30 hover:bg-success/20"><CheckCircle className="h-3 w-3" /> GPS Verified</Badge>;
    case 'REVIEW':
      return <Badge className="gap-1 bg-amber-500/20 text-amber-700 border-amber-300 hover:bg-amber-500/20"><AlertCircle className="h-3 w-3" /> Needs Review</Badge>;
    case 'FLAGGED':
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Flagged</Badge>;
    default:
      return null;
  }
};

// ── Lightbox ───────────────────────────────────────────────────────────────
const Lightbox = ({ images, initialIndex, onClose }: {
  images: { url: string; label: string }[];
  initialIndex: number;
  onClose: () => void;
}) => {
  const [index, setIndex] = useState(initialIndex);

  const prev = () => setIndex(i => (i - 1 + images.length) % images.length);
  const next = () => setIndex(i => (i + 1) % images.length);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
        onClick={onClose}
      >
        <X className="h-8 w-8" />
      </button>

      {images.length > 1 && (
        <>
          <button
            className="absolute left-4 text-white/70 hover:text-white transition-colors p-2"
            onClick={e => { e.stopPropagation(); prev(); }}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            className="absolute right-4 text-white/70 hover:text-white transition-colors p-2"
            onClick={e => { e.stopPropagation(); next(); }}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      <div className="max-w-4xl max-h-full px-16 py-8" onClick={e => e.stopPropagation()}>
        <img
          src={images[index].url}
          alt={images[index].label}
          className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
        />
        <p className="text-white/70 text-center text-sm mt-3">
          {images[index].label} ({index + 1} / {images.length})
        </p>
      </div>
    </div>
  );
};

// ── Image thumbnail ─────────────────────────────────────────────────────────
const ImageThumbnail = ({ url, label, onClick }: { url: string; label: string; onClick: () => void }) => (
  <div
    className="group relative rounded-xl overflow-hidden border border-border bg-muted cursor-pointer aspect-[4/3]"
    onClick={onClick}
  >
    <img src={url} alt={label} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </div>
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
      <p className="text-white text-xs font-medium">{label}</p>
    </div>
  </div>
);

// ── Info row ────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
};

// ── Bool chip ───────────────────────────────────────────────────────────────
const BoolChip = ({ label, value }: { label: string; value: boolean | null | undefined }) => (
  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
    value === true  ? 'bg-success/10 text-success border-success/20' :
    value === false ? 'bg-muted text-muted-foreground border-border' :
                     'bg-muted text-muted-foreground border-border'
  }`}>
    {value === true ? <CheckCircle className="h-3 w-3" /> : <X className="h-3 w-3 opacity-40" />}
    {label}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: employee, isLoading } = useEmployeeById(id);
  const { data: settings } = useCompanySettings();
  const requestReverification = useRequestReverification();
  const reviewVerification = useReviewVerification();
  const [reviewNotes, setReviewNotes] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: { url: string; label: string }[]; index: number } | null>(null);

  const latestVerification = employee?.verification_records?.[0] as any;
  const distanceThreshold = (settings as any)?.distance_threshold_km ?? 1.0;

  // ── Build image list for lightbox ─────────────────────────────────────────
  const buildImageList = (v: any) => {
    const list: { url: string; label: string }[] = [];
    if (v?.images?.front_view)  list.push({ url: v.images.front_view,  label: 'Front View' });
    if (v?.images?.street_view) list.push({ url: v.images.street_view, label: 'Street View' });
    if (v?.images?.gate_view)   list.push({ url: v.images.gate_view,   label: 'Gate / Fence View' });
    (v?.images?.additional_images || []).forEach((url: string, i: number) =>
      list.push({ url, label: `Additional Photo ${i + 1}` })
    );
    return list;
  };

  const openLightbox = (allImages: { url: string; label: string }[], index: number) => {
    setLightbox({ images: allImages, index });
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!latestVerification) return;
    try {
      await reviewVerification.mutateAsync({
        recordId: latestVerification.id,
        reviewStatus: status,
        reviewNotes: reviewNotes.trim() || undefined,
      });
      toast({
        title: status === 'approved' ? 'Verification Approved' : 'Verification Rejected',
        description: status === 'approved'
          ? 'The verification has been approved.'
          : 'The verification has been rejected and marked as failed.',
      });
      setReviewNotes('');
      setShowReviewForm(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to review verification', variant: 'destructive' });
    }
  };

  const copyInviteLink = () => {
    if (employee) {
      navigator.clipboard.writeText(`${window.location.origin}/invite?token=${employee.invite_token}`);
      toast({ title: 'Copied!', description: 'Invite link has been copied to clipboard.' });
    }
  };

  const handleRequestReverification = async () => {
    if (!latestVerification) return;
    try {
      await requestReverification.mutateAsync(latestVerification.id);
      toast({ title: 'Re-verification requested', description: 'The employee will need to verify their location again.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to request re-verification', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card><CardContent className="pt-6 space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardContent></Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">Employee Not Found</h2>
        <Button asChild><Link to="/admin/employees">Back to Employees</Link></Button>
      </div>
    );
  }

  const allImages = buildImageList(latestVerification);
  const pd = latestVerification?.property_details;
  const od = latestVerification?.occupancy_details;
  const ad = latestVerification?.address_details;

  return (
    <>
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/employees')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </Button>

        {/* ── Employee Info ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">{employee.full_name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Added {format(new Date(employee.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(employee.invite_status, latestVerification?.status)}
                {latestVerification?.internal_flag && getInternalFlagBadge(latestVerification.internal_flag)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{employee.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{employee.phone || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {employee.invite_status === 'invited' && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Invite Link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm overflow-hidden text-ellipsis">
                      {window.location.origin}/invite?token={employee.invite_token}
                    </code>
                    <Button onClick={copyInviteLink} size="icon" variant="outline">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Inspection Details ────────────────────────────────────────── */}
        {latestVerification && (
          <>
            {/* ── Section A: Address ─────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <CardTitle className="text-base">Address Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {ad ? (
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="md:col-span-2">
                      <InfoRow label="Full Address" value={ad.full_address} />
                    </div>
                    <InfoRow label="Landmark"  value={ad.landmark} />
                    <InfoRow label="City"      value={ad.city} />
                    <InfoRow label="LGA"       value={ad.lga} />
                    <InfoRow label="State"     value={ad.state} />
                  </div>
                ) : (
                  /* V1 fallback */
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="md:col-span-2">
                      <InfoRow label="Street" value={latestVerification.street} />
                    </div>
                    <InfoRow label="City"     value={latestVerification.city} />
                    <InfoRow label="State"    value={latestVerification.state} />
                    <InfoRow label="ZIP"      value={latestVerification.zip} />
                    <InfoRow label="Landmark" value={latestVerification.landmark} />
                  </div>
                )}

                {latestVerification.verification_window_start && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Verification window:</span>
                      <span className="font-medium">
                        {latestVerification.verification_window_start} – {latestVerification.verification_window_end}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Section B: Property Details ──────────────────────────────── */}
            {pd && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-violet-600" />
                    </div>
                    <CardTitle className="text-base">Property Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                    <InfoRow label="Building Type"    value={pd.building_type} />
                    <InfoRow label="Purpose"          value={pd.building_purpose} />
                    <InfoRow label="Status"           value={pd.building_status} />
                    <InfoRow label="Building Colour"  value={pd.building_colour} />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <BoolChip label="Has Fence" value={pd.has_fence} />
                    <BoolChip label="Has Gate"  value={pd.has_gate} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Section C: Occupancy Details ─────────────────────────────── */}
            {od && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                      <Users className="h-4 w-4 text-emerald-600" />
                    </div>
                    <CardTitle className="text-base">Occupancy Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                    <InfoRow label="Who lives here"      value={od.occupants} />
                    <InfoRow label="Relationship"        value={od.relationship} />
                    {od.notes && (
                      <div className="md:col-span-2">
                        <InfoRow label="Additional notes" value={od.notes} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Section D: Property Photos ────────────────────────────────── */}
            {allImages.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-amber-600" />
                    </div>
                    <CardTitle className="text-base">Property Photos</CardTitle>
                    <span className="ml-auto text-xs text-muted-foreground">{allImages.length} photo{allImages.length !== 1 ? 's' : ''}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {allImages.map((img, i) => (
                      <ImageThumbnail
                        key={i}
                        url={img.url}
                        label={img.label}
                        onClick={() => openLightbox(allImages, i)}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <ZoomIn className="h-3 w-3" /> Click any photo to enlarge
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── GPS Verification Result ──────────────────────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-cyan-600" />
                  </div>
                  <CardTitle className="text-base">GPS Verification</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestVerification?.distance_flagged && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Distance Mismatch Detected</AlertTitle>
                    <AlertDescription>
                      Employee verified {formatDistance(latestVerification.distance_km)} from submitted address.
                      Exceeds the {distanceThreshold}km threshold.
                    </AlertDescription>
                  </Alert>
                )}

                {latestVerification.verified_at ? (
                  <div className={`p-4 rounded-lg ${latestVerification.distance_flagged ? 'bg-destructive/10' : 'bg-success/10'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {latestVerification.distance_flagged ? (
                        <><AlertCircle className="h-5 w-5 text-destructive" /><span className="font-semibold text-destructive">Location Verified (Distance Flagged)</span></>
                      ) : (
                        <><CheckCircle className="h-5 w-5 text-success" /><span className="font-semibold text-success">Location Verified</span></>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-2 text-sm">
                      <InfoRow label="Verified at" value={format(new Date(latestVerification.verified_at), 'MMM d, yyyy h:mm a')} />
                      {latestVerification.latitude && latestVerification.longitude && (
                        <InfoRow label="GPS Coordinates" value={`${latestVerification.latitude.toFixed(6)}, ${latestVerification.longitude.toFixed(6)}`} />
                      )}
                      {latestVerification.distance_km !== null && (
                        <InfoRow label="Distance from address" value={formatDistance(latestVerification.distance_km)} />
                      )}
                      {latestVerification.internal_flag?.reason && (
                        <div className="md:col-span-2">
                          <InfoRow label="Internal assessment" value={latestVerification.internal_flag.reason} />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">GPS verification not yet completed.</p>
                )}

                {/* Review status */}
                {latestVerification.review_status && latestVerification.review_status !== 'pending' && (
                  <div className={`p-4 rounded-lg ${latestVerification.review_status === 'approved' ? 'bg-success/10 border border-success/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {latestVerification.review_status === 'approved' ? (
                        <><ThumbsUp className="h-4 w-4 text-success" /><span className="font-semibold text-success">Admin Approved</span></>
                      ) : (
                        <><ThumbsDown className="h-4 w-4 text-destructive" /><span className="font-semibold text-destructive">Admin Rejected</span></>
                      )}
                    </div>
                    {latestVerification.review_notes && (
                      <p className="text-sm text-muted-foreground mt-1">Notes: {latestVerification.review_notes}</p>
                    )}
                    {latestVerification.reviewed_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Reviewed {format(new Date(latestVerification.reviewed_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                )}

                {/* Review actions */}
                {latestVerification.verified_at && (!latestVerification.review_status || latestVerification.review_status === 'pending') && (
                  <div className="pt-2 space-y-3">
                    {!showReviewForm ? (
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={() => setShowReviewForm(true)} variant="outline" className="gap-1">
                          <ThumbsUp className="h-4 w-4" /> Approve / Reject
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleRequestReverification}
                          disabled={requestReverification.isPending}
                        >
                          {requestReverification.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                          Request Re-verification
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 border rounded-lg p-4">
                        <Textarea
                          placeholder="Add review notes (optional)..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleReview('approved')}
                            disabled={reviewVerification.isPending}
                            className="gap-1 bg-success hover:bg-success/90"
                          >
                            {reviewVerification.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleReview('rejected')}
                            disabled={reviewVerification.isPending}
                            className="gap-1"
                          >
                            {reviewVerification.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
                            Reject
                          </Button>
                          <Button variant="ghost" onClick={() => { setShowReviewForm(false); setReviewNotes(''); }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Re-verify after review */}
                {latestVerification.status === 'verified' && latestVerification.review_status && latestVerification.review_status !== 'pending' && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      onClick={handleRequestReverification}
                      disabled={requestReverification.isPending}
                    >
                      {requestReverification.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Request Re-verification
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Map ─────────────────────────────────────────────────────── */}
            {(latestVerification.expected_latitude || latestVerification.latitude) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Map className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">Location Map</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <VerificationMap
                    expectedLatitude={latestVerification.expected_latitude}
                    expectedLongitude={latestVerification.expected_longitude}
                    actualLatitude={latestVerification.latitude}
                    actualLongitude={latestVerification.longitude}
                    submittedAddress={
                      ad?.full_address ||
                      `${latestVerification.street || ''}${latestVerification.city ? `, ${latestVerification.city}` : ''}${latestVerification.state ? `, ${latestVerification.state}` : ''}`
                    }
                    distanceKm={latestVerification.distance_km}
                    distanceFlagged={latestVerification.distance_flagged}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!latestVerification && employee.invite_status === 'accepted' && (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Awaiting Address Submission</h3>
              <p className="text-muted-foreground">The employee hasn't submitted their address yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default EmployeeDetail;