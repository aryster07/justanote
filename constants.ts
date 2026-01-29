import { Song, QueueItem } from './types';

export const MOCK_SONGS: Song[] = [
  {
    id: '1',
    title: 'Levitating',
    artist: 'Dua Lipa',
    coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwuFxr9GHYJqnWb2G2pd1iqrG99Rx9dKhMzMb3Em1kUKY6pIKBVq9t5RofK8VsjfSj54pPEwkACJirWwLQM3jRiT1ilfgRti95YNFn6b8TvGFTn7c0a_oBgdFSRZUme89dL5Hrea_rTFtiskD39nc8Vfe4m6E8yYfsSBO-P7jTcNqwP2MaWBMw0j6NWa9mXJ9bNRwvmtGilBCYdwdc3VCY1mftvdWjU90GNUL0Ju8PhiyYxPYupl63z6L51rR3Q0cWaBiOViFnL1T0',
    duration: '3:23'
  },
  {
    id: '2',
    title: 'As It Was',
    artist: 'Harry Styles',
    coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB45nQfUQ9WjBGY4n-kacLQ10uO1TjgBuaf9WJawC68jQWKUxu--tsyoLAYk8b2XMGAe3S7GKSKfJo6vOobTOgkgNt-VUEjC6opYXmElU73YTkyt7n7OaDlOGEZ3aAL2zeuX_VV3-uQMCvgFZ8VK9VM-PjbX8Vw41e2hG2py8kd32NwTq9ruajDK9Ug6sAxHaZsfwSCByQ-lmiy-jCObjH4LDLUhITODrj18J3ZeecrVyNWn8XFklHfHt_wWmCIe6LiEvoOqRu5-_Dg',
    duration: '2:47'
  },
  {
    id: '3',
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHrgrRNIk4GmGYJaKok2fIC08D2oqcMFkhok-eHc9GlDkEQ6JhdyWYpM1qw7z3xVf_pryZSFPBAMaAZAcIHiFImz4uDNSWsZOqo5q9LmPbTPW3HSMhMTsy8F1lJ709u7dIvM6vtSM0CMCr-H5vB__gyTFlT0-dUcQ3uM1D4X62ihGLiAUqwpovg9NjmbYkQ2A-rGoYY4ThHvgcZer_cKfzmotdmnH4m2bWgHg0eyfsiUAXHwFUrNI8oayjT3mH5uL6DqIqx8rK7x1u',
    duration: '2:58'
  },
  {
    id: '4',
    title: 'Golden Hour',
    artist: 'JVKE',
    coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAj_stMsrd0ARs_qmBaaHIPBwvzmnK57JnGN__OwGwktXcgI1Npedla0rMoi9tdrF2L1DVU2gZwFo5e2d4-k1LGTghuT9A-tF6njmpl_4vtsyUiIOcYjoHhbbjEEizVYP3gSjdZs3RhnMxHOPgEs_c4Goh4QYfq_7_reWzDf72cOZ0VFVsEHAGTvMZ_MzoUxkwfCyVb6y0Aqnkf7cL4wP2zPchYlKGT3HrRXqadqrK9VlzG537-37HKuOjSrOHjtJjwEJ6c6lRCE-rn',
    duration: '3:29'
  }
];

export const MOCK_QUEUE: QueueItem[] = [
  { id: '1', handle: '@sarah_designs', status: 'pending', date: 'Oct 24, 2023' },
  { id: '2', handle: '@mike_ventures', status: 'pending', date: 'Oct 23, 2023' },
  { id: '3', handle: '@chloe_eats', status: 'pending', date: 'Oct 21, 2023' },
];
