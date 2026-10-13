import streamlit as st


def apply_style() -> None:
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap');
        :root { --blue: #315fe8; --teal: #0f897d; --ink: #142238; --muted: #64748b; --line: #dce4ef; }
        .stApp { background: #f5f8fc; color: var(--ink); }
        [data-testid="stHeader"] { background: rgba(245,248,252,.92); }
        [data-testid="stSidebar"] { background: #eaf1fa; border-right: 1px solid var(--line); }
        .block-container { max-width: 1440px; padding-top: 1.6rem; padding-bottom: 3rem; }
        h1,h2,h3 { font-family: 'Manrope',sans-serif; color: var(--ink); letter-spacing: 0; }
        p,label,button,input,textarea { font-family: 'DM Sans',sans-serif; }
        [data-testid="stMetric"] { min-height: 105px; padding: .9rem 1rem; background: white; border: 1px solid var(--line); border-top: 3px solid var(--blue); border-radius: 7px; }
        [data-testid="stTabs"] button[aria-selected="true"] { color: var(--blue); border-bottom-color: var(--blue); }
        [data-testid="stForm"] { padding: 1rem; background: white; border: 1px solid var(--line); border-radius: 7px; }
        .hero { padding: 2rem 0; }
        .eyebrow { color: var(--blue); font-size: .75rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
        .hero-title { margin: .6rem 0 1rem; color: var(--ink); font-family: 'Manrope',sans-serif; font-size: 2.8rem; font-weight: 800; line-height: 1.08; }
        .hero-title span { color: var(--blue); }
        .hero-copy { max-width: 620px; color: var(--muted); font-size: 1.06rem; line-height: 1.7; }
        .section-title { margin: 1.4rem 0 .25rem; color: var(--ink); font-family: 'Manrope',sans-serif; font-size: 1.65rem; font-weight: 800; }
        .section-copy { margin-bottom: 1rem; color: var(--muted); }
        .sample-banner { padding: .75rem 1rem; color: #684d16; background: #fff8e6; border: 1px solid #f0dfad; border-radius: 5px; font-size: .88rem; }
        .item-card { min-height: 118px; padding: 1rem; background: #fff; border: 1px solid var(--line); border-radius: 7px; }
        .item-name { color: var(--ink); font-family: 'Manrope',sans-serif; font-size: 1rem; font-weight: 700; }
        .item-meta { color: var(--muted); font-size: .88rem; line-height: 1.6; }
        @media (max-width: 640px) { .hero-title { font-size: 2.3rem; } .section-title { font-size: 1.4rem; } }
        </style>
        """,
        unsafe_allow_html=True,
    )


def section_heading(kicker: str, title: str, description: str = "") -> None:
    st.markdown(f'<div class="eyebrow">{kicker}</div><div class="section-title">{title}</div>', unsafe_allow_html=True)
    if description:
        st.markdown(f'<div class="section-copy">{description}</div>', unsafe_allow_html=True)


def sample_notice() -> None:
    st.markdown('<div class="sample-banner">Demo environment: sample hospitals, clinicians, ratings, and locations are fictional and must not be used for real care.</div>', unsafe_allow_html=True)
