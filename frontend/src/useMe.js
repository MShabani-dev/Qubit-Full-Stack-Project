import { useEffect, useState } from 'react';
import api from './api/api';


export default function useMe() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    if (!localStorage.getItem('access')) return;
    api.get('/api/me/').then(r => setMe(r.data)).catch(() => setMe(null));
  }, []);
  return me;
}
