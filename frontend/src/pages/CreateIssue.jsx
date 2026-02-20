import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { issueService } from '@services/issueService';
import { ISSUE_CATEGORIES, MAX_FILES, MAX_FILE_SIZE_MB } from '@utils/constants';
import { buildGeoPoint, validateFiles, reverseGeocode } from '@utils/formatters';

export default function CreateIssue() {
  const navigate = useNavigate();
  const fileRef  = useRef();

  const [form, setForm] = useState({
    title:            '',
    description:      '',
    category:         ISSUE_CATEGORIES[0],
    seriousnessRating: 3,
  });
  const [files,      setFiles]      = useState([]);
  const [fileErrs,   setFileErrs]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState('');
  const [geoError,   setGeoError]   = useState('');
  const [geoStatus,  setGeoStatus]  = useState('');  // progress message shown to user
  const [detectedLocation, setDetectedLocation] = useState(null); // { city, address }

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    const errs = validateFiles(selected, MAX_FILES);
    setFileErrs(errs);
    if (!errs.length) setFiles(selected);
  };

  const getLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const lat = coords.latitude;
          const lng = coords.longitude;
          // Guard against browsers that return invalid values
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            reject(new Error('Your device returned invalid location coordinates. Please try again.'));
            return;
          }
          resolve({ lat, lng });
        },
        (err) => {
          const msg =
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied. Please allow location access in your browser settings.'
              : err.code === err.POSITION_UNAVAILABLE
              ? 'Your location could not be determined. Please check your device\'s GPS or network.'
              : 'Location request timed out. Please try again.';
          reject(new Error(msg));
        },
        { timeout: 10000, maximumAge: 60000 }  // 10 s timeout, accept 1-min-old cached fix
      );
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (fileErrs.length) return;

    setLoading(true);
    setApiError('');
    setGeoError('');
    setGeoStatus('');
    setDetectedLocation(null);

    // ── Step 1: Get GPS coordinates
    setGeoStatus('\uD83D\uDCCD Detecting your location\u2026');
    let coords;
    try {
      coords = await getLocation();
    } catch (err) {
      setGeoError(err.message);
      setGeoStatus('');
      setLoading(false);
      return;
    }

    // ── Step 2: Reverse geocode to city/address (non-blocking — failure is OK)
    setGeoStatus('\uD83C\uDFD9\uFE0F Looking up address\u2026');
    const geo = await reverseGeocode(coords.lat, coords.lng);
    if (geo.city || geo.address) {
      setDetectedLocation(geo);
    }
    setGeoStatus('');

    try {
      // Validate coords one final time before submitting
      if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
        setGeoError('Invalid coordinates received from your device. Please try again.');
        setLoading(false);
        return;
      }

      const fd = new FormData();
      fd.append('title',             form.title);
      fd.append('description',       form.description);
      fd.append('category',          form.category);
      fd.append('seriousnessRating', form.seriousnessRating);
      // Include city/address in the GeoJSON so issues display a location label
      fd.append('location', JSON.stringify(
        buildGeoPoint(coords.lat, coords.lng, {
          city:    geo.city    || undefined,
          address: geo.address || undefined,
          ward:    geo.ward    || undefined,
        })
      ));
      files.forEach((file) => fd.append('images', file));

      const issue = await issueService.createIssue(fd);
      navigate(`/issues/${issue._id ?? issue.data?._id}`);
    } catch (err) {
      setApiError(err.message || 'Failed to submit issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 620, margin: '0 auto', padding: '2rem 1rem' }}>
      <button onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        ← Back
      </button>
      <h1 style={{ marginBottom: '1.5rem' }}>Report an Issue</h1>

      {apiError && <div style={{ background: '#fef2f2', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem' }}>{apiError}</div>}
      {geoError && <div style={{ background: '#fffbeb', color: 'var(--color-warning)', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem' }}>{geoError}</div>}
      {geoStatus && (
        <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #1d4ed8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          {geoStatus}
        </div>
      )}
      {detectedLocation && (
        <div style={{ background: '#f0fdf4', color: '#15803d', padding: '0.75rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          \uD83D\uDCCD Location detected: <strong>{detectedLocation.address || detectedLocation.city}</strong>
          {detectedLocation.city && detectedLocation.address && ` \u2014 ${detectedLocation.city}`}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Title */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Title *</label>
          <input name="title" value={form.title} onChange={handleChange} required maxLength={200} placeholder="Brief description of the issue" style={inputStyle} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Description *</label>
          <textarea name="description" value={form.description} onChange={handleChange} required rows={4} maxLength={2000} placeholder="Detailed description…" style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Category */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Category *</label>
          <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
            {ISSUE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Seriousness Rating */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Seriousness Rating: {form.seriousnessRating} / 5</label>
          <input type="range" name="seriousnessRating" min={1} max={5} value={form.seriousnessRating} onChange={handleChange} style={{ width: '100%' }} />
        </div>

        {/* Images */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Photos (up to {MAX_FILES}, max {MAX_FILE_SIZE_MB} MB each)</label>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
          <button type="button" onClick={() => fileRef.current.click()} style={{ border: '1px dashed var(--color-border)', padding: '0.65rem 1rem', borderRadius: 'var(--radius)', background: '#f9fafb', cursor: 'pointer', width: '100%' }}>
            {files.length ? `${files.length} file(s) selected` : 'Click to select images'}
          </button>
          {fileErrs.map((err, i) => <p key={i} style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{err}</p>)}
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '1rem' }}>
          {loading ? 'Submitting…' : 'Submit Issue'}
        </button>
      </form>
    </main>
  );
}

const labelStyle = { display: 'block', fontWeight: 500, marginBottom: '0.3rem', fontSize: '0.9rem' };
const inputStyle = { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: '1rem', outline: 'none' };
