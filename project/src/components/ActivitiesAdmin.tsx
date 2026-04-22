async function createActivity() {
  if (!newActivity.name.trim()) {
    alert('Activity name is required');
    return;
  }

  setCreating(true);

  try {
    const cleanName = newActivity.name.trim();

    const payload = {
      name: cleanName,
      title: cleanName,
      description: newActivity.description.trim(),
      duration_hours: Number(newActivity.duration_hours || 0),
      capacity: Number(newActivity.capacity || 0),
      price: Number(newActivity.price || 0),
      image_url: newActivity.image_url || '',
      gallery_images: newGalleryFiles,
      active: true,
    };

    const { error } = await supabase.from('activities').insert([payload]);

    if (error) {
      console.error('Error creating activity:', error);
      alert('Error creating activity');
    } else {
      alert('Activity created!');
      setNewActivity(emptyNewActivity);
      setNewGalleryFiles([]);
      await loadActivities();
    }
  } catch (err) {
    console.error(err);
    alert('Unexpected error');
  } finally {
    setCreating(false);
  }
}