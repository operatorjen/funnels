export const ASCENDING = 'ASCENDING', DESCENDING = 'DESCENDING', OSCILLATING = 'OSCILLATING'

export class Funnels {
  constructor(config = {}) {
    this.cfg = {
      floorThreshold: config.floorThreshold || 0.1,
      gravity: config.gravity || 0.01,
      friction: config.friction || 0.98,
      spiralTightness: config.spiralTightness || 0.05,
      interactionRadius: config.interactionRadius || 0.3,
      maxRotations: config.maxRotations || 20,
      minFunnelCount: config.minFunnelCount || 2,
      maxFunnelCount: config.maxFunnelCount || 5,
      energyRegeneration: config.energyRegeneration || 0.02,
      turbulence: config.turbulence || 0.05,
      bounceFactor: config.bounceFactor || 0.3,
      oscillationStrength: config.oscillationStrength || 0.1,
      bayesianInfluence: config.bayesianInfluence || 0.5
    }
    this.funnels = new Map()
    this.interactionHandlers = new Map()
    this.globalPhase = 0
    this.gs = {
      energyMean: 0.5,
      energyVariance: 0.1,
      veloMean: 0.1,
      veloVariance: 0.05,
      stateDist: { DESCENDING: 0.6, ASCENDING: 0.2, OSCILLATING: 0.2 },
      updateCount: 0
    }
    this._generateFunnels(this.cfg.minFunnelCount, this.cfg.maxFunnelCount)
  }

  _generateFunnels(min, max) {
    const f = Math.floor(Math.random() * (max - min + 1)) + min
    for (let fI = 1; fI <= f; fI++) {
      const oC = Math.floor(Math.random() * 4) + 2, oB = []
      for (let j = 0; j < oC; j++) {
        const iF = Math.random() > 0.5
        oB.push({
          id: `${fI}-${j + 1}`,
          speed: iF ? Math.random() * 0.3 + 0.2 : Math.random() * 0.1 + 0.05,
          type: iF ? 'fast' : 'slow',
          oscillationPhase: Math.random() * Math.PI * 2,
          lastEnergyChange: 0,
          state: DESCENDING,
          interactionHistory: []
        })
      }
      this._addFunnel(fI, oB)
    }
  }

  _addFunnel(id, initialObjects = []) {
    this.funnels.set(id, {
      objects: initialObjects.map(obj => ({
        ...obj,
        pos: { radius: 0.7 + Math.random() * 0.3, angle: Math.random() * Math.PI * 2, height: 0.5 + Math.random() * 0.4 },
        velo: obj.speed || 0.1, rotationPhase: Math.random() * Math.PI * 2, energy: 0.6 + Math.random() * 0.4,
        baseEnergy: 0.6 + Math.random() * 0.4
      })),
      rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.02
    })
  }

  _updateFunnel(funnel, deltaTime) {
    for (const obj of funnel.objects) {
      obj.oscillationPhase += 0.1 * deltaTime * obj.energy
      const o = Math.sin(obj.oscillationPhase) * this.cfg.oscillationStrength * obj.energy
      this._updateObjectState(obj, deltaTime)
      const t = (Math.random() - 0.5) * this.cfg.turbulence * obj.energy
      obj.energy += (obj.baseEnergy - obj.energy) * this.cfg.energyRegeneration * deltaTime
      const s = this._calcSpiralRadius(obj.pos.height)
      obj.pos.angle += this._calcAngularVelocity(obj, s) * deltaTime * Math.sign(obj.velo)
      obj.pos.height -= obj.velo * deltaTime * (obj.pos.height < 0.3 ? 0.8 : 1.0)
      obj.pos.height += o * deltaTime
      obj.pos.radius = s
      obj.velo += this.cfg.gravity * (1 - obj.energy * 0.3) * deltaTime
      obj.velo += t * deltaTime
      obj.velo *= this.cfg.friction
      if (obj.pos.height <= this.cfg.floorThreshold && obj.velo > 0) {
        obj.velo = -obj.velo * this.cfg.bounceFactor, obj.pos.height = this.cfg.floorThreshold + 0.01
        obj.energy *= 0.95, obj.state = ASCENDING
      }
      if (Math.random() < 0.005 * deltaTime) this._triggerRandomEvent(obj)
      if (Math.abs(obj.velo) > 0.3 + obj.energy * 0.2) obj.velo *= 0.9
      this._clampObjectValues(obj)
      obj.pos.angle = obj.pos.angle % (Math.PI * 2)
    }
  }

  _updateObjectState(obj, deltaTime) {
    obj.lastEnergyChange += deltaTime
    switch (obj.state) {
      case DESCENDING:
        if (obj.energy > 1.2 && Math.random() < 0.01) {
          obj.state = OSCILLATING, obj.velo *= 0.5
        } else if (obj.pos.height < 0.3 && obj.energy > 0.8) {
          obj.state = ASCENDING, obj.velo = -Math.abs(obj.velo) * 1.5
        }
        break
      case ASCENDING:
        if (obj.pos.height > 0.8 || obj.energy < 0.5) {
          obj.state = DESCENDING
        } else if (obj.energy > 1.0 && Math.random() < 0.02) {
          obj.state = OSCILLATING
        }
        break
      case OSCILLATING:
        obj.velo += (Math.random() - 0.5) * 0.1 * deltaTime
        if (obj.energy < 0.6 || Math.random() < 0.01) obj.state = obj.pos.height > 0.5 ? DESCENDING : ASCENDING
        break
    }
    if (obj.state === OSCILLATING && obj.lastEnergyChange > 10) {
      obj.energy += (Math.random() - 0.3) * 0.2, obj.lastEnergyChange = 0
    }
  }

  _triggerRandomEvent(obj) {
    const eventType = Math.random()
    if (eventType < 0.3) {
      obj.energy += 0.3 + Math.random() * 0.4
      obj.state = OSCILLATING
    } else if (eventType < 0.6) {
      obj.velo += (Math.random() - 0.5) * 0.3
    } else {
      const st = [DESCENDING, ASCENDING, OSCILLATING]
      obj.state = st[Math.floor(Math.random() * st.length)]
    }
  }

  _calcSpiralRadius(height) {
    const b = Math.exp(-this.cfg.spiralTightness * (1 - height) * this.cfg.maxRotations)
    const v = Math.sin(this.globalPhase + height * 10) * 0.1
    return Math.max(0.05, b + v)
  }

  _calcAngularVelocity(obj, currentRadius) {
    const b = 0.3
    const e = 0.5 + obj.energy * 0.5
    return (b / Math.max(0.05, currentRadius)) * e
  }

  _clampObjectValues(obj) {
    obj.energy = Math.max(0.1, Math.min(2.0, obj.energy))
    obj.velo = Math.max(-0.5, Math.min(0.5, obj.velo))
    obj.pos.height = Math.max(this.cfg.floorThreshold - 0.1, Math.min(1.5, obj.pos.height))
  }

  _updateGlobalState() {
    const all = this._getall()
    if (all.length === 0) return
    const e = all.map(obj => obj.energy)
    const v = all.map(obj => Math.abs(obj.velo))
    const s = all.map(obj => obj.state)
    const nE = e.reduce((a, b) => a + b, 0) / e.length
    const nV = v.reduce((a, b) => a + b, 0) / v.length
    const eV = e.reduce((sum, energy) => sum + Math.pow(energy - nE, 2), 0) / e.length
    const vV = v.reduce((sum, velo) => sum + Math.pow(velo - nV, 2), 0) / v.length
    const scs = { DESCENDING: 0, ASCENDING: 0, OSCILLATING: 0 }
    s.forEach(state => scs[state]++)
    const t = s.length
    const nS = { DESCENDING: scs[DESCENDING] / t, ASCENDING: scs[ASCENDING] / t, OSCILLATING: scs[OSCILLATING] / t }
    const lR = 1 / (this.gs.updateCount + 1)
    this.gs.energyMean = this.gs.energyMean * (1 - lR) + nE * lR
    this.gs.veloMean = this.gs.veloMean * (1 - lR) + nV * lR
    this.gs.energyVariance = this.gs.energyVariance * (1 - lR) + eV * lR
    this.gs.veloVariance = this.gs.veloVariance * (1 - lR) + vV * lR
    Object.keys(this.gs.stateDist).forEach(s => { this.gs.stateDist[s] = this.gs.stateDist[s] * (1 - lR) + nS[s] * lR })
    this.gs.updateCount++
  }

  _getall() {
    const all = []
    for (const [_, funnel] of this.funnels) { all.push(...funnel.objects) }
    return all
  }

  _bayesianInteractionHandler(objA, objB, distance) {
    const pS = this.cfg.bayesianInfluence
    const eR = (this._calcLikelihood(objA, objB) * (1 - pS)) + (this._calcEnergyPrior(objA, objB) * pS)
    const eT = (objA.energy - objB.energy) * eR * (1 - distance / this.cfg.interactionRadius)
    objA.energy -= eT, objB.energy += eT
    const vT = (this._calcVelocityTransferLikelihood(objA, objB) * (1 - pS)) + (this._calcVelocityPrior(objA, objB) * pS)
    const v = (objA.velo - objB.velo) * vT * (1 - distance / this.cfg.interactionRadius) * 0.5
    objA.velo -= v, objB.velo += v
    this._applyBayesianStateInfluence(objA, objB)
    objA.interactionHistory.push({
      with: objB.id,
      eT: Math.abs(eT),
      veloTransfer: Math.abs(v),
      timestamp: Date.now()
    })
    objB.interactionHistory.push({
      with: objA.id,
      eT: Math.abs(eT),
      veloTransfer: Math.abs(v),
      timestamp: Date.now()
    })
    if (objA.interactionHistory.length > 10) objA.interactionHistory.shift()
    if (objB.interactionHistory.length > 10) objB.interactionHistory.shift()
    this._clampObjectValues(objA)
    this._clampObjectValues(objB)
  }

  _calcLikelihood(objA, objB) {
    const e = Math.abs(objA.energy - objB.energy), b = 0.3, s = 1 - (e / 2), t = objA.type !== objB.type ? 1.5 : 1.0
    return b * s * t
  }

  _calcEnergyPrior(objA, objB) {
    const g = this.gs.energyMean, ev = this.gs.energyVariance, e = Math.sqrt(ev * 2), a = Math.abs(objA.energy - objB.energy)
    const s = Math.min(2, a / (e + 0.001)), aD = Math.abs(objA.energy - g), bD = Math.abs(objB.energy - g), m = (aD + bD) / 2
    const n = Math.min(1, m / Math.sqrt(ev + 0.001))
    return 0.2 * s * n
  }

  _calcVelocityTransferLikelihood(objA, objB) {
    const v = Math.abs(objA.velo - objB.velo), b = 0.1
    return b * Math.min(1, v / 0.5)
  }

  _calcVelocityPrior(objA, objB) {
    const g = this.gs.veloMean, v = this.gs.veloVariance, e = Math.sqrt(v * 2), a = Math.abs(objA.velo - objB.velo)
    const s = Math.min(2, a / (e + 0.001)), aR = objA.velo / (g + 0.001), bR = objB.velo / (g + 0.001), sim = 1 - Math.abs(aR - bR) / (aR + bR)
    return 0.05 * s * sim
  }

  _applyBayesianStateInfluence(objA, objB) {
    const t = 0.02 * this.cfg.bayesianInfluence
    if (Math.random() < t) { const tS = this._selectUnder(); Math.random() < 0.5 ? objA.state = tS : objB.state = tS
    }
  }

  _selectUnder() {
    const s = Object.entries(this.gs.stateDist), u = s.reduce((min, [state, prob]) =>
      prob < min.prob ? { state, prob } : min, { state: DESCENDING, prob: 1 })
    return u.state
  }

  _handleInteractions() {
    const all = []
    for (const [i, f] of this.funnels) { for (const obj of f.objects) { all.push({ i, obj, worldPos: this._getWorldPosition(i, obj) }) }}
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j], d = this._calcDistance(a.worldPos, b.worldPos)
        if (d < this.cfg.interactionRadius) this._applyInteraction(a, b, d)
      }
    }
  }

  _getWorldPosition(fId, obj) {
    const f = this.funnels.get(fId)
    return {
      x: obj.pos.radius * Math.cos(obj.pos.angle + f.rotation), y: obj.pos.height, z: obj.pos.radius * Math.sin(obj.pos.angle + f.rotation)
    }
  }

  _calcDistance(a, b) { return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2)) }

  _applyInteraction(a, b, distance) { this._bayesianInteractionHandler(a.obj, b.obj, distance) }

  update(deltaTime = 1) {
    this.globalPhase += 0.01 * deltaTime
    this._updateGlobalState()
    for (const [_, funnel] of this.funnels) {
      funnel.rotation += funnel.rotationSpeed * deltaTime
      this._updateFunnel(funnel, deltaTime)
    }
    this._handleInteractions()
  }

  getFunnelState(fId) {
    const f = this.funnels.get(fId)
    if (!f || f.objects.length === 0) return { objectCount: 0, avgHeight: 0, avgEnergy: 0, objects: [] }
    const tH = f.objects.reduce((sum, obj) => sum + obj.pos.height, 0), tE = f.objects.reduce((sum, obj) => sum + obj.energy, 0)
    const aH = tH / f.objects.length, aE = tE / f.objects.length, sC = {}
    f.objects.forEach(obj => { sC[obj.state] = (sC[obj.state] || 0) + 1 })
    return {
      objectCount: f.objects.length, avgHeight: aH, avgEnergy: aE, stateCounts: sC,
      objects: f.objects.map(obj => ({
        id: obj.id, type: obj.type, state: obj.state, pos: { ...obj.pos }, velo: obj.velo, energy: obj.energy, interactionHistory: obj.interactionHistory
      }))
    }
  }

  getAllFunnelStates() {
    const s = {}
    for (const fId of this.funnels.keys()) { s[fId] = this.getFunnelState(fId) }
    return s
  }

  getGlobalState() {
    return {
      ...this.gs, totalObjects: this._getall().length, totalFunnels: this.funnels.size, energyMean: parseFloat(this.gs.energyMean.toFixed(3)),
      energyVariance: parseFloat(this.gs.energyVariance.toFixed(3)), veloMean: parseFloat(this.gs.veloMean.toFixed(3)),
      veloVariance: parseFloat(this.gs.veloVariance.toFixed(3))
    }
  }
}