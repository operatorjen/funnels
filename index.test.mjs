import { Funnels } from './index.mjs'

class FunnelTest {
  constructor() {
    this.system = new Funnels({ 
      minFunnelCount: 3, 
      maxFunnelCount: 6,
      bayesianInfluence: 0.4,
      turbulence: 0.03
    })
    this.cycleCount = 0
    this.stabilityHistory = []
  }

  formatFunnelState(funnelId, state) {
    const stateSymbols = {
      DESCENDING: '⤵', ASCENDING: '⤴', OSCILLATING: '〰'
    }
    
    const stateDisplay = Object.entries(state.stateCounts).map(([s, count]) => `${stateSymbols[s] || s}:${count}`).join(' ')
    return `${funnelId}: 🌪️ x ${state.objectCount} | ` + `⚡: ${state.avgEnergy.toFixed(3)} | ` +
           `📏: ${state.avgHeight.toFixed(3)} | ` + `${stateDisplay}`
  }

  formatGlobalState(gs) {
    return `Global: 🌐 ${gs.totalFunnels} funnels, ${gs.totalObjects} objects | ` +
           `⚡ ${gs.energyMean.toFixed(3)} ± ${gs.energyVariance.toFixed(3)} | ` +
           `🌀 ${gs.veloMean.toFixed(3)} ± ${gs.veloVariance.toFixed(3)}`
  }

  analyzeStability(gs) {
    const energyStability = gs.energyVariance / (gs.energyMean + 0.001)
    this.stabilityHistory.push(energyStability)
    if (this.stabilityHistory.length > 5) this.stabilityHistory.shift()
    
    const avgStability = this.stabilityHistory.reduce((a, b) => a + b, 0) / this.stabilityHistory.length
    
    if (avgStability < 0.1) {
      return 'STABLE - Bayesian priors dominating system behavior'
    } else if (avgStability > 0.3) {
      return 'TURBULENT - Local interactions creating chaotic dynamics'
    } else {
      return 'BALANCED - Mixed Bayesian and local influences'
    }
  }

  getInteractionSummary(allStates) {
    let totalInteractions = 0
    let maxInteractions = 0
    let mostActiveObject = null
    
    Object.values(allStates).forEach(state => {
      state.objects.forEach(obj => {
        const interactionCount = obj.interactionHistory?.length || 0
        totalInteractions += interactionCount
        if (interactionCount > maxInteractions) {
          maxInteractions = interactionCount
          mostActiveObject = obj
        }
      })
    })
    
    return {
      totalInteractions,
      avgInteractions: totalInteractions / (Object.values(allStates).reduce((sum, state) => sum + state.objects.length, 0) || 1),
      mostActive: mostActiveObject ? `${mostActiveObject.id} (${maxInteractions} interactions)` : 'none'
    }
  }

  runCycle() {
    this.system.update(1)
    this.cycleCount++

    const allStates = this.system.getAllFunnelStates()
    const globalState = this.system.getGlobalState()
    const interactionSummary = this.getInteractionSummary(allStates)
    const stabilityAnalysis = this.analyzeStability(globalState)

    console.log(`\n${'🌪️ '.repeat(15)} CYCLE ${this.cycleCount} ${'🌪️ '.repeat(15)}\n`)

    for (const [funnelId, state] of Object.entries(allStates)) {
      console.log(this.formatFunnelState(funnelId, state))
    }
    
    console.log(`\n${this.formatGlobalState(globalState)}`)
    console.log(`Interactions: ${interactionSummary.totalInteractions} total, ${interactionSummary.avgInteractions.toFixed(1)} avg, most active: ${interactionSummary.mostActive}`)
    
    if (this.cycleCount % 5 === 0) console.log(`\n📊 ${stabilityAnalysis}`)

    if (this.cycleCount % 10 === 0) {
      console.log(`\n🔍 Sample Object Details:`)
      const sampleFunnel = Object.values(allStates)[0]
      if (sampleFunnel && sampleFunnel.objects.length > 0) {
        const sampleObj = sampleFunnel.objects[0]
        console.log(`   ${sampleObj.id} | ${sampleObj.type} | ${sampleObj.state} | energy:${sampleObj.energy.toFixed(2)} | velo:${sampleObj.velo.toFixed(3)}`)
        if (sampleObj.interactionHistory?.length > 0) {
          console.log(`   Recent interactions: ${sampleObj.interactionHistory.length}`)
        }
      }
    }
  }

  start() {
    console.log('🧪 Starting Funnel System Test')
    setInterval(() => {
      this.runCycle()
    }, 1000)
  }
}

const test = new FunnelTest()
test.start()