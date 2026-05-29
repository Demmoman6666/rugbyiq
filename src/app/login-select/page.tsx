'use client'
import { useRouter } from 'next/navigation'
const FF='Barlow Condensed,system-ui,sans-serif'
const GOLD='#e8a020',BG='#060912',NAV='#080e1a',CARD='#0d1117',BD='#1e2d3d',TEXT='#e2e8f0',MUTED='#64748b'
export default function LoginSelectPage() {
  const router = useRouter()
  return (
    <div style={{fontFamily:FF,background:BG,minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      <div style={{background:NAV,borderBottom:`1px solid ${BD}`,padding:'14px 28px',display:'flex',alignItems:'center'}}>
        <div onClick={()=>router.push('/')} style={{fontSize:22,fontWeight:900,letterSpacing:3,color:TEXT,cursor:'pointer'}}>CLUB<span style={{color:GOLD}}>CODE</span></div>
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <div style={{width:'100%',maxWidth:480}}>
          <div style={{textAlign:'center',marginBottom:40}}>
            <div style={{fontSize:28,fontWeight:900,letterSpacing:2,color:TEXT,marginBottom:8}}>WELCOME BACK</div>
            <div style={{fontSize:14,color:MUTED}}>Choose how you want to sign in</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div onClick={()=>router.push('/login')} style={{background:CARD,border:`1px solid ${BD}`,borderRadius:12,padding:'28px',cursor:'pointer'}} onMouseEnter={e=>(e.currentTarget.style.borderColor=GOLD+'88')} onMouseLeave={e=>(e.currentTarget.style.borderColor=BD)}>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <div style={{fontSize:36}}>📊</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:18,fontWeight:900,color:TEXT,letterSpacing:1,marginBottom:4}}>ANALYST LOGIN</div>
                  <div style={{fontSize:12,color:MUTED}}>For coaches and analysts — code matches, build reviews, run AI scans</div>
                </div>
                <div style={{fontSize:20,color:MUTED}}>→</div>
              </div>
            </div>
            <div onClick={()=>router.push('/player/login')} style={{background:CARD,border:`1px solid ${BD}`,borderRadius:12,padding:'28px',cursor:'pointer'}} onMouseEnter={e=>(e.currentTarget.style.borderColor=GOLD+'88')} onMouseLeave={e=>(e.currentTarget.style.borderColor=BD)}>
              <div style={{display:'flex',alignItems:'center',gap:16}}>
                <div style={{fontSize:36}}>🏉</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:18,fontWeight:900,color:TEXT,letterSpacing:1,marginBottom:4}}>PLAYER LOGIN</div>
                  <div style={{fontSize:12,color:MUTED}}>For players — view your match footage, code events, build highlight reels</div>
                </div>
                <div style={{fontSize:20,color:MUTED}}>→</div>
              </div>
            </div>
          </div>
          <div style={{textAlign:'center',marginTop:28,fontSize:12,color:MUTED}}>
            Don't have an account? <span onClick={()=>router.push('/login?signup=true')} style={{color:GOLD,cursor:'pointer'}}>Start free →</span>
          </div>
        </div>
      </div>
    </div>
  )
}
