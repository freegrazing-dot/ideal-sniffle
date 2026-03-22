import { useState, useEffect } from 'react';
import { RefreshCw, Save, ExternalLink, CheckCircle, AlertCircle, Plus, Trash2, Calendar, Clock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';

interface ExternalCalendar {
  id: string;
  property_id: string;
  source: string;
  ical_url: string;
  last_synced_at: string | null;
  is_active: boolean;
}

interface ExternalCalendarEvent {
  id: string;
  source: string;
  start_date: string;
  end_date: string;
  summary: string;
  status: string;
}

const CALENDAR_SOURCES = [
  { value: 'airbnb', label: 'Airbnb', color: 'bg-pink-100 text-pink-800' },
  { value: 'booking_com', label: 'Booking.com', color: 'bg-blue-100 text-blue-800' },
  { value: 'vrbo', label: 'VRBO', color: 'bg-purple-100 text-purple-800' },
  { value: 'homeaway', label: 'HomeAway', color: 'bg-orange-100 text-orange-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' },
];

export function PropertyCalendarSync() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [calendars, setCalendars] = useState<Record<string, ExternalCalendar[]>>({});
  const [events, setEvents] = useState<Record<string, ExternalCalendarEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [addingCalendar, setAddingCalendar] = useState<string | null>(null);
  const [newCalendar, setNewCalendar] = useState({ source: 'airbnb', url: '' });
  const [messages, setMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .order('name');

      if (propertiesError) throw propertiesError;
      setProperties(propertiesData || []);

      const { data: calendarsData, error: calendarsError } = await supabase
        .from('external_calendar_urls')
        .select('*')
        .order('source');

      if (calendarsError) throw calendarsError;

      const calendarsByProperty: Record<string, ExternalCalendar[]> = {};
      calendarsData?.forEach((cal) => {
        if (!calendarsByProperty[cal.property_id]) {
          calendarsByProperty[cal.property_id] = [];
        }
        calendarsByProperty[cal.property_id].push(cal);
      });
      setCalendars(calendarsByProperty);

      const { data: eventsData, error: eventsError } = await supabase
        .from('external_calendar_events')
        .select('id, property_id, source, start_date, end_date, summary, status')
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date');

      if (eventsError) throw eventsError;

      const eventsByProperty: Record<string, ExternalCalendarEvent[]> = {};
      eventsData?.forEach((event) => {
        if (!eventsByProperty[event.property_id]) {
          eventsByProperty[event.property_id] = [];
        }
        eventsByProperty[event.property_id].push(event);
      });
      setEvents(eventsByProperty);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCalendar = async (propertyId: string) => {
    if (!newCalendar.url.trim()) {
      showMessage(propertyId, 'error', 'Please enter a calendar URL');
      return;
    }

    try {
      const { error } = await supabase
        .from('external_calendar_urls')
        .insert({
          property_id: propertyId,
          source: newCalendar.source,
          ical_url: newCalendar.url,
          is_active: true,
        });

      if (error) throw error;

      showMessage(propertyId, 'success', 'Calendar source added successfully');
      setAddingCalendar(null);
      setNewCalendar({ source: 'airbnb', url: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error adding calendar:', error);
      showMessage(propertyId, 'error', error.message || 'Failed to add calendar');
    }
  };

  const removeCalendar = async (calendarId: string, propertyId: string) => {
    if (!confirm('Are you sure you want to remove this calendar source?')) return;

    try {
      const { error } = await supabase
        .from('external_calendar_urls')
        .delete()
        .eq('id', calendarId);

      if (error) throw error;

      showMessage(propertyId, 'success', 'Calendar source removed');
      fetchData();
    } catch (error: any) {
      console.error('Error removing calendar:', error);
      showMessage(propertyId, 'error', error.message || 'Failed to remove calendar');
    }
  };

  const toggleCalendar = async (calendarId: string, propertyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('external_calendar_urls')
        .update({ is_active: !currentStatus })
        .eq('id', calendarId);

      if (error) throw error;

      showMessage(propertyId, 'success', `Calendar ${!currentStatus ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch (error: any) {
      console.error('Error toggling calendar:', error);
      showMessage(propertyId, 'error', error.message || 'Failed to toggle calendar');
    }
  };

  const syncProperty = async (propertyId: string) => {
    setSyncing(propertyId);
    clearMessage(propertyId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-airbnb-calendar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ property_id: propertyId }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to sync calendar');

      showMessage(propertyId, 'success', `Synced ${result.events_synced || 0} events`);
      fetchData();
    } catch (error: any) {
      console.error('Error syncing calendar:', error);
      showMessage(propertyId, 'error', error.message || 'Failed to sync calendar');
    } finally {
      setSyncing(null);
    }
  };

  const syncAllCalendars = async () => {
    setSyncingAll(true);
    setGlobalMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-all-calendars`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to sync calendars');

      setGlobalMessage({
        type: 'success',
        text: result.message || `Successfully synced ${result.total_events_synced || 0} events across ${result.properties_synced || 0} properties`
      });

      fetchData();
      setTimeout(() => setGlobalMessage(null), 5000);
    } catch (error: any) {
      console.error('Error syncing all calendars:', error);
      setGlobalMessage({
        type: 'error',
        text: error.message || 'Failed to sync calendars'
      });
    } finally {
      setSyncingAll(false);
    }
  };

  const showMessage = (propertyId: string, type: 'success' | 'error', text: string) => {
    setMessages({ ...messages, [propertyId]: { type, text } });
    setTimeout(() => clearMessage(propertyId), 5000);
  };

  const clearMessage = (propertyId: string) => {
    setMessages(prev => {
      const newMessages = { ...prev };
      delete newMessages[propertyId];
      return newMessages;
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSourceLabel = (source: string) => {
    return CALENDAR_SOURCES.find(s => s.value === source)?.label || source;
  };

  const getSourceColor = (source: string) => {
    return CALENDAR_SOURCES.find(s => s.value === source)?.color || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
        <p className="mt-4 text-gray-600">Loading calendar sync data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Calendar Synchronization</h2>
            <p className="text-gray-600 mt-2">
              Sync multiple calendar sources (Airbnb, Booking.com, VRBO, etc.) to prevent double bookings.
              External bookings automatically block dates on your calendar.
            </p>
          </div>
          <button
            onClick={syncAllCalendars}
            disabled={syncingAll}
            className="ml-4 px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            <RefreshCw className={`w-5 h-5 ${syncingAll ? 'animate-spin' : ''}`} />
            {syncingAll ? 'Syncing All...' : 'Sync All Properties'}
          </button>
        </div>
        {globalMessage && (
          <div className={`mt-4 p-4 rounded-lg flex items-center gap-2 ${
            globalMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {globalMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {globalMessage.text}
          </div>
        )}
      </div>

      {properties.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <p>No properties found</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {properties.map((property) => {
            const propertyCalendars = calendars[property.id] || [];
            const propertyEvents = events[property.id] || [];
            const isExpanded = expandedProperty === property.id;
            const isSyncing = syncing === property.id;
            const isAdding = addingCalendar === property.id;
            const message = messages[property.id];
            const activeCalendars = propertyCalendars.filter(c => c.is_active);
            const totalEvents = propertyEvents.length;

            return (
              <div key={property.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                    <p className="text-sm text-gray-600">{property.location}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{activeCalendars.length} active source{activeCalendars.length !== 1 ? 's' : ''}</span>
                      </div>
                      {totalEvents > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{totalEvents} blocked date{totalEvents !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {property.last_sync_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Last sync: {formatDate(property.last_sync_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedProperty(isExpanded ? null : property.id)}
                      className="px-4 py-2 text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors text-sm font-medium"
                    >
                      {isExpanded ? 'Hide Details' : 'Show Details'}
                    </button>
                    {propertyCalendars.length > 0 && (
                      <button
                        onClick={() => syncProperty(property.id)}
                        disabled={isSyncing}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </button>
                    )}
                  </div>
                </div>

                {message && (
                  <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                    message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {message.type === 'success' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm">{message.text}</span>
                  </div>
                )}

                {isExpanded && (
                  <div className="mt-4 space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">Calendar Sources</h4>
                        <button
                          onClick={() => setAddingCalendar(isAdding ? null : property.id)}
                          className="text-sm text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1"
                        >
                          {isAdding ? (
                            <>
                              <X className="w-4 h-4" />
                              Cancel
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Add Source
                            </>
                          )}
                        </button>
                      </div>

                      {isAdding && (
                        <div className="mb-4 p-4 bg-white rounded-lg border-2 border-cyan-200">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Source
                              </label>
                              <select
                                value={newCalendar.source}
                                onChange={(e) => setNewCalendar({ ...newCalendar, source: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              >
                                {CALENDAR_SOURCES.map(source => (
                                  <option key={source.value} value={source.value}>{source.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                iCal URL
                              </label>
                              <input
                                type="url"
                                value={newCalendar.url}
                                onChange={(e) => setNewCalendar({ ...newCalendar, url: e.target.value })}
                                placeholder="https://www.airbnb.com/calendar/ical/..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              />
                            </div>
                            <button
                              onClick={() => addCalendar(property.id)}
                              className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              Add Calendar Source
                            </button>
                          </div>
                        </div>
                      )}

                      {propertyCalendars.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No calendar sources configured. Add one to start syncing.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {propertyCalendars.map((calendar) => (
                            <div
                              key={calendar.id}
                              className={`p-3 bg-white rounded-lg border ${
                                calendar.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSourceColor(calendar.source)}`}>
                                      {getSourceLabel(calendar.source)}
                                    </span>
                                    {!calendar.is_active && (
                                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                        Disabled
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <a
                                      href={calendar.ical_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 hover:text-cyan-600 truncate max-w-md"
                                    >
                                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{calendar.ical_url}</span>
                                    </a>
                                  </div>
                                  {calendar.last_synced_at && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Last synced: {formatDate(calendar.last_synced_at)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <button
                                    onClick={() => toggleCalendar(calendar.id, property.id, calendar.is_active)}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                      calendar.is_active
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    {calendar.is_active ? 'Active' : 'Disabled'}
                                  </button>
                                  <button
                                    onClick={() => removeCalendar(calendar.id, property.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Remove calendar source"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {propertyEvents.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">
                          Blocked Dates ({propertyEvents.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                          {propertyEvents.map((event) => (
                            <div key={event.id} className="p-3 bg-white rounded border border-gray-200">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSourceColor(event.source)}`}>
                                      {getSourceLabel(event.source)}
                                    </span>
                                  </div>
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {event.summary || 'Blocked'}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {formatDateShort(event.start_date)} - {formatDateShort(event.end_date)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
