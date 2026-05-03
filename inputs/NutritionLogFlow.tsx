/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Plus, 
  Camera, 
  Trash2, 
  Search, 
  Clock, 
  History,
  CheckCircle2,
  X,
  Upload,
  Home,
  Users,
  BarChart3,
  Bell,
  Edit2
} from 'lucide-react';
import { NutritionLog, MealLog, FoodItem, MealType } from '../types';
import { Badge } from '../components/Common';

// --- Types & Constants ---

const FIXED_MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];

const MOCK_TARGETS = {
  calories: 2200,
  protein: 160,
  carbs: 250,
  fat: 70
};

const INITIAL_LOG: NutritionLog = {
  date: new Date().toISOString().split('T')[0],
  meals: [
    {
      type: 'Breakfast',
      time: '08:30',
      items: [
        { id: '1', name: 'Oatmeal with Blueberries', quantity: 1, unit: 'bowl', calories: 320, protein: 12, carbs: 54, fat: 8 }
      ]
    },
    {
      type: 'Lunch',
      time: '13:15',
      items: [
        { id: '2', name: 'Quinoa Salad with Chickpeas', quantity: 1.5, unit: 'cups', calories: 410, protein: 18, carbs: 62, fat: 14 }
      ]
    },
    {
      type: 'Dinner',
      time: '19:45',
      items: []
    }
  ],
  targets: MOCK_TARGETS
};

// --- Sub-components ---

const MacroStat = ({ label, current, target, unit }: { label: string; current: number; target: number; unit: string }) => {
  const ratio = current / target;
  let progressColor = 'bg-primary';
  if (ratio >= 0.8 && ratio <= 1.0) progressColor = 'bg-amber';
  if (ratio > 1.0) progressColor = 'bg-red';

  return (
    <div className="space-y-1.5 text-left">
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none opacity-60">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-[14px] font-black text-text-primary leading-none">{current}{unit}</span>
        <span className="text-[10px] font-medium text-text-secondary opacity-40">/ {target}{unit}</span>
      </div>
      <div className="h-[3px] w-full bg-input-bg rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, ratio * 100)}%` }}
          className={`h-full ${progressColor} transition-all duration-700 ease-out`}
        />
      </div>
    </div>
  );
};

const BottomNavMock = ({ activeTab = 'home' }: { activeTab?: string }) => (
  <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-border-light px-6 py-3 flex items-center justify-between z-50 pb-8 sm:pb-6">
    <div className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-primary' : 'text-text-secondary opacity-60'}`}>
       <Home size={20} />
       <span className="text-[10px] font-medium">Home</span>
    </div>
    <div className="flex flex-col items-center gap-1 text-text-secondary opacity-60">
       <Users size={20} />
       <span className="text-[10px] font-medium">Experts</span>
    </div>
    <div className="flex flex-col items-center gap-1 text-text-secondary opacity-60">
       <BarChart3 size={20} />
       <span className="text-[10px] font-medium">Stats</span>
    </div>
    <div className="flex flex-col items-center gap-1 text-text-secondary opacity-60">
       <Bell size={20} />
       <span className="text-[10px] font-medium">Alerts</span>
    </div>
  </nav>
);

// --- Main Flow Component ---

export default function NutritionLogFlow({ onBack }: { onBack: () => void }) {
  const [screen, setScreen] = useState<1 | 2 | 3>(1);
  const [log, setLog] = useState<NutritionLog>(INITIAL_LOG);
  const [selectedMealType, setSelectedMealType] = useState<MealType | null>('Lunch');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<FoodItem[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Derive data
  const selectedMeal = log.meals.find(m => m.type === selectedMealType);
  const totalMacros = log.meals.flatMap(m => m.items).reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: acc.protein + item.protein,
    carbs: acc.carbs + item.carbs,
    fat: acc.fat + item.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const currentMealMacros = (selectedMeal?.items || []).reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: acc.protein + item.protein,
    carbs: acc.carbs + item.carbs,
    fat: acc.fat + item.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const handleSaveToMeal = () => {
    if (!selectedMealType) return;
    setLog(prev => ({
      ...prev,
      meals: prev.meals.map(m => m.type === selectedMealType ? {
        ...m,
        items: [...m.items, ...detectedItems.map(di => ({ ...di, id: Math.random().toString(36).substr(2, 9) }))]
      } : m)
    }));
    setScreen(2);
    setDetectedItems([]);
    setCapturedImage(null);
  };

  const handleRemoveItem = (itemId: string) => {
    setLog(prev => ({
      ...prev,
      meals: prev.meals.map(m => m.type === selectedMealType ? {
        ...m,
        items: m.items.filter(i => i.id !== itemId)
      } : m)
    }));
  };

  const handleRemoveDetectedItem = (idx: number) => {
    setDetectedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddDetectedItem = () => {
    const newItem: FoodItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Item',
      quantity: 100,
      unit: 'g',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      confidence: 'Medium'
    };
    setDetectedItems(prev => [...prev, newItem]);
  };

  const handleUpdateItemCalories = (itemId: string, newCalories: number) => {
    setLog(prev => ({
      ...prev,
      meals: prev.meals.map(m => m.type === selectedMealType ? {
        ...m,
        items: m.items.map(i => i.id === itemId ? { ...i, calories: newCalories } : i)
      } : m)
    }));
  };

  const handleUpdateMealName = (newName: string) => {
    if (!selectedMealType) return;
    const oldType = selectedMealType;
    setLog(prev => ({
      ...prev,
      meals: prev.meals.map(m => m.type === oldType ? { ...m, type: newName } : m)
    }));
    setSelectedMealType(newName);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      setLog(prev => ({ ...prev, date: newDate }));
    }
  };

  const handleAddCustomMeal = () => {
    const newMeal: MealLog = {
      type: 'Other',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      items: []
    };
    setLog(prev => ({ ...prev, meals: [...prev.meals, newMeal] }));
    setSelectedMealType('Other');
    setScreen(2);
  };

  // --- Screens ---

  const renderScreen1 = () => (
    <div className="flex flex-col h-full bg-background relative overflow-hidden flex-1">
      <header className="px-5 py-4 flex items-center justify-between border-b-[0.5px] border-border-light bg-white">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1">
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-[17px] font-bold text-text-primary leading-none">Nutrition Log</h1>
            <p className="text-[11px] text-text-secondary mt-1 font-medium">
              {new Date(log.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        <div className="relative">
          <input 
            type="date" 
            ref={dateInputRef}
            onChange={handleDateChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <button 
            onClick={() => dateInputRef.current?.showPicker()}
            className="text-primary active:scale-95 transition-transform"
          >
            <Calendar size={22} className="stroke-[2.5px]" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 pb-24 scrollbar-hide">
        {/* Daily Summary Card */}
        <div className="bg-white rounded-2xl p-6 border-[0.5px] border-border-light shadow-sm">
          <div className="grid grid-cols-2 gap-x-10 gap-y-6">
            <MacroStat label="Calories" current={totalMacros.calories} target={log.targets.calories} unit="kcal" />
            <MacroStat label="Protein" current={totalMacros.protein} target={log.targets.protein} unit="g" />
            <MacroStat label="Carbs" current={totalMacros.carbs} target={log.targets.carbs} unit="g" />
            <MacroStat label="Fat" current={totalMacros.fat} target={log.targets.fat} unit="g" />
          </div>
        </div>

        {/* Meal List */}
        <div className="space-y-2">
          {log.meals.map((meal, index) => {
            const cals = meal.items.reduce((sum, i) => sum + i.calories, 0);
            const hasFood = meal.items.length > 0;
            
            return (
              <button 
                key={meal.type + index}
                onClick={() => { setSelectedMealType(meal.type); setScreen(2); }}
                className="w-full flex items-center gap-4 py-4 px-4 bg-white rounded-xl border-[0.5px] border-border-light active:bg-input-bg transition-colors relative overflow-hidden group"
              >
                {hasFood && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary/20 transition-all group-hover:w-2" />}
                <div className="text-2xl w-10 h-10 rounded-lg bg-input-bg flex items-center justify-center grayscale-[0.5] group-active:scale-90 transition-transform">
                   {meal.type.includes('Breakfast') ? '🥞' : 
                   meal.type.includes('Lunch') ? '🥗' : 
                   meal.type.includes('Dinner') ? '🥘' : '🍲'}
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-[14px] font-medium text-text-primary">{meal.type}</h4>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[12px] font-bold ${hasFood ? 'text-text-primary' : 'text-text-secondary opacity-30 italic'}`}>
                    {hasFood ? `${cals} kcal` : '— kcal'}
                  </span>
                  <ChevronRight size={16} className="text-text-secondary opacity-30 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
          
          <button 
            onClick={handleAddCustomMeal}
            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-white/50 rounded-xl border-[1px] border-dashed border-border-light text-text-secondary font-medium hover:bg-white active:scale-95 transition-all text-[13px]"
          >
            <Plus size={16} />
            Add other meal
          </button>
        </div>
      </div>
      <BottomNavMock />
    </div>
  );

  const renderScreen2 = () => {
    const isFixed = FIXED_MEAL_TYPES.includes(selectedMealType || '');
    
    return (
      <div className="flex flex-col h-full bg-background relative overflow-hidden flex-1">
        <header className="px-5 py-4 border-b-[0.5px] border-border-light bg-white">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => setScreen(1)} className="p-1 -ml-1">
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1 flex flex-col min-w-0">
              {isFixed ? (
                <h1 className="text-[17px] font-bold text-text-primary leading-none truncate">{selectedMealType}</h1>
              ) : (
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={selectedMealType || ''} 
                    onChange={(e) => handleUpdateMealName(e.target.value)}
                    className="text-[17px] font-bold text-text-primary leading-none bg-transparent border-b border-primary/20 outline-none w-full py-0.5"
                    placeholder="Enter meal name..."
                    autoFocus
                  />
                  <Edit2 size={12} className="text-primary shrink-0" />
                </div>
              )}
              <p className="text-[11px] text-text-secondary mt-1 font-medium">
                {new Date(log.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Calories', v: currentMealMacros.calories, u: 'kcal' },
                { l: 'Protein', v: currentMealMacros.protein, u: 'g' },
                { l: 'Carbs', v: currentMealMacros.carbs, u: 'g' },
                { l: 'Fat', v: currentMealMacros.fat, u: 'g' },
              ].map(m => (
                <div key={m.l} className="flex items-center justify-between bg-input-bg/10 border-[0.5px] border-border-light rounded-lg px-3 py-1.5">
                  <p className="text-[9px] font-black text-text-secondary uppercase opacity-40">{m.l}</p>
                  <p className="text-[12px] font-bold text-text-primary">{m.v}{m.u}</p>
                </div>
              ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-1 pb-32 scrollbar-hide">
          {selectedMeal?.items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-20">
              <button 
                onClick={() => setShowAddSheet(true)}
                className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center text-text-secondary opacity-30 hover:opacity-100 hover:border-primary active:scale-95 transition-all"
              >
                <Plus size={32} />
              </button>
              <p className="text-[14px] font-medium text-text-secondary opacity-50">No food items added yet</p>
            </div>
          ) : (
            selectedMeal?.items.map((item) => (
              <motion.div 
                layout
                key={item.id}
                className="flex items-center gap-4 py-4 border-b-[0.5px] border-border-light group relative active:bg-input-bg transition-colors pr-2"
              >
                <div className="flex-1">
                  <h5 className="text-[14px] font-bold text-text-primary">{item.name}</h5>
                  <p className="text-[11px] text-text-secondary">{item.quantity} {item.unit}</p>
                </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-input-bg rounded px-2 py-1 focus-within:bg-white focus-within:ring-1 focus-within:ring-primary transition-all shadow-inner">
                  <input 
                    type="number" 
                    value={item.calories} 
                    onChange={(e) => handleUpdateItemCalories(item.id, parseInt(e.target.value) || 0)}
                    className="text-[13px] font-black text-text-primary bg-transparent outline-none w-11 text-right"
                  />
                  <span className="text-[10px] font-bold text-text-secondary ml-1 opacity-40">kcal</span>
                </div>
                <button 
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-2 text-red/40 hover:text-red transition-colors active:scale-95"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="absolute bottom-20 left-0 right-0 px-6 py-4 pointer-events-none">
          <button 
            onClick={() => setShowAddSheet(true)}
            className="w-full bg-primary h-[54px] rounded-xl text-white font-black text-[15px] flex items-center justify-center gap-2 shadow-xl shadow-primary/20 active:scale-95 transition-all pointer-events-auto"
          >
            <Plus size={20} className="stroke-[3px]" />
            Add food
          </button>
        </div>

        <BottomNavMock />

        {/* Bottom Sheet Modal */}
        <AnimatePresence>
          {showAddSheet && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-[60]"
                onClick={() => setShowAddSheet(false)}
              />
              <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[24px] z-[70] shadow-2xl pb-12 overflow-hidden"
              >
                <div className="w-10 h-1 bg-border-light rounded-full mx-auto my-3" />
                <div className="flex border-b border-border-light">
                  {['Search', 'Photo', 'Recent'].map(tab => (
                     <button 
                      key={tab} 
                      onClick={() => tab === 'Photo' && (setScreen(3), setShowAddSheet(false))}
                      className="flex-1 py-4 text-[13px] font-bold text-text-secondary relative active:text-primary transition-colors"
                     >
                       <div className="flex flex-col items-center gap-1.5 opacity-60 active:opacity-100">
                          {tab === 'Search' && <Search size={18} />}
                          {tab === 'Photo' && <Camera size={18} />}
                          {tab === 'Recent' && <History size={18} />}
                          {tab}
                       </div>
                       {tab === 'Search' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />}
                     </button>
                  ))}
                </div>
                <div className="p-6 space-y-6">
                  <div className="bg-input-bg p-4 rounded-xl flex items-center gap-3">
                    <Search size={18} className="text-text-secondary opacity-40 ml-1" />
                    <input type="text" placeholder="Search food items..." className="bg-transparent outline-none flex-1 text-[14px]" />
                  </div>
                  <div className="flex flex-col gap-4 mt-4">
                     <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest opacity-30">Recent items</p>
                     {[
                       { n: 'Egg Sandwich', c: 250 },
                       { n: 'Greek Yogurt', c: 150 }
                     ].map((item, i) => (
                       <button 
                        key={i} 
                        onClick={() => {
                          const newItem: FoodItem = {
                            id: Math.random().toString(36).substr(2, 9),
                            name: item.n,
                            quantity: 1,
                            unit: 'serving',
                            calories: item.c,
                            protein: 10,
                            carbs: 20,
                            fat: 5
                          };
                          setLog(prev => ({
                            ...prev,
                            meals: prev.meals.map(m => m.type === selectedMealType ? { ...m, items: [...m.items, newItem] } : m)
                          }));
                          setShowAddSheet(false);
                        }}
                        className="flex items-center justify-between py-3 border-b-[0.5px] border-border-light border-dashed active:bg-input-bg rounded transition-colors px-2"
                       >
                          <span className="text-[14px] font-medium text-text-primary">{item.n}</span>
                          <span className="text-[12px] font-bold text-text-secondary">{item.c} kcal</span>
                       </button>
                     ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderScreen3 = () => {
    const handleCapture = () => {
      setIsDetecting(true);
      setCapturedImage("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop"); // Simulated
      setTimeout(() => {
        setDetectedItems([
          { id: '101', name: 'Grilled Chicken', quantity: 200, unit: 'g', calories: 330, protein: 58, carbs: 0, fat: 9, confidence: 'High' },
          { id: '102', name: 'Fresh Avocado', quantity: 1, unit: 'pcs', calories: 120, protein: 2, carbs: 6, fat: 12, confidence: 'High' },
          { id: '103', name: 'Boiled Rice', quantity: 150, unit: 'g', calories: 165, protein: 4, carbs: 35, fat: 1, confidence: 'Medium' },
        ]);
        setIsDetecting(false);
      }, 1800);
    };

    return (
      <div className="flex flex-col h-full bg-black relative overflow-hidden flex-1">
        <button onClick={() => setScreen(2)} className="absolute top-6 left-6 z-50 p-2 bg-black/40 text-white rounded-full backdrop-blur-md hover:bg-black/60 transition-colors">
           <X size={24} />
        </button>

        {/* Top Half: Camera View */}
        <div className="relative h-[45%] flex items-center justify-center bg-[#0d0d0d]">
          {capturedImage ? (
            <div className="w-full h-full relative">
              <img src={capturedImage} className="w-full h-full object-cover" alt="Meal" />
              <div className="absolute top-6 right-6 w-12 h-12 rounded-xl border-2 border-white/50 overflow-hidden shadow-2xl">
                <img src={capturedImage} className="w-full h-full object-cover" alt="Original" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-white/20">
              <Camera size={48} strokeWidth={1} />
              <p className="text-[13px] font-medium tracking-wide">Capture your meal photo</p>
            </div>
          )}

          {!capturedImage && !isDetecting && (
             <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4">
                <button onClick={handleCapture} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 cursor-pointer hover:scale-105 active:scale-95 transition-all">
                  <div className="w-full h-full bg-white rounded-full transition-transform" />
                </button>
                <button className="flex items-center gap-2 text-white/80 text-[12px] font-black py-2 px-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 active:scale-95 transition-all">
                   <Upload size={14} />
                   Upload from gallery
                </button>
             </div>
          )}
          
          {isDetecting && (
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-[80%] h-[80%] border-2 border-white/20 border-dashed rounded-3xl animate-pulse" />
             </div>
          )}
        </div>

        {/* Bottom Half: Results Panel */}
        <div className="flex-1 bg-white rounded-t-[32px] mt-[-32px] relative z-10 px-6 pt-8 pb-10 flex flex-col overflow-hidden shadow-2xl">
          <div className="w-10 h-1 bg-border-light rounded-full mx-auto mb-6 opacity-30" />
          
          <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide">
            {isDetecting ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-center space-y-4">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent shadow-lg" />
                </motion.div>
                <div className="space-y-1">
                  <h4 className="text-[18px] font-black text-text-primary">Detecting ingredients...</h4>
                  <p className="text-[12px] text-text-secondary px-6 opacity-70">Identifiying portions and nutritional values using our AI engine.</p>
                </div>
              </div>
            ) : detectedItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-12 text-center space-y-4">
                <div className="p-6 bg-input-bg rounded-full">
                  <Plus size={32} />
                </div>
                <p className="text-[14px] font-medium font-mono text-text-secondary tracking-tight">WAITING FOR INPUT...</p>
              </div>
            ) : (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <h3 className="text-[18px] font-black text-text-primary tracking-tight">We detected these items —</h3>
                <div className="space-y-4">
                  {detectedItems.map((item, idx) => (
                    <div key={idx} className="bg-background rounded-2xl p-4 border-[0.5px] border-border-light space-y-4 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={item.name} 
                              onChange={(e) => {
                                const newName = e.target.value;
                                setDetectedItems(prev => prev.map((di, i) => i === idx ? { ...di, name: newName } : di));
                              }}
                              className="text-[15px] font-black text-text-primary bg-transparent outline-none w-fit border-b border-transparent focus:border-primary transition-all" 
                            />
                            <Badge text={item.confidence || 'High'} color={item.confidence === 'High' ? 'green' : 'amber'} size="xs" />
                          </div>
                          <div className="flex items-center gap-2">
                             <input 
                               type="number" 
                               defaultValue={item.quantity} 
                               onChange={(e) => {
                                 const newQty = parseInt(e.target.value) || 0;
                                 setDetectedItems(prev => prev.map((di, i) => i === idx ? { ...di, quantity: newQty } : di));
                               }}
                               className="w-14 bg-white border border-border-light rounded-lg px-2 text-[11px] font-bold py-1.5 outline-none focus:ring-1 focus:ring-primary shadow-inner" 
                             />
                             <div className="flex bg-white border border-border-light rounded-lg p-0.5 overflow-hidden shadow-inner">
                                {['g', 'ml', 'pcs'].map(u => (
                                  <button 
                                    key={u} 
                                    onClick={() => setDetectedItems(prev => prev.map((di, i) => i === idx ? { ...di, unit: u } : di))}
                                    className={`px-2 py-1 text-[9px] font-black rounded ${item.unit.startsWith(u) ? 'bg-primary text-white shadow-sm' : 'text-text-secondary opacity-30 hover:opacity-100 transition-all'}`}
                                  >
                                    {u.toUpperCase()}
                                  </button>
                                ))}
                             </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveDetectedItem(idx)}
                          className="text-red hover:text-red-dark transition-colors p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="flex gap-2">
                        {[
                          { l: 'CAL', v: item.calories, f: 'calories' },
                          { l: 'PRO', v: item.protein, f: 'protein' },
                          { l: 'CAR', v: item.carbs, f: 'carbs' },
                          { l: 'FAT', v: item.fat, f: 'fat' },
                        ].map(m => (
                          <div key={m.l} className="flex-1 bg-white border border-border-light rounded-full py-1.5 px-2 flex items-center justify-between active:scale-95 transition-transform hover:border-primary/20 shadow-sm focus-within:ring-1 focus-within:ring-primary">
                            <span className="text-[8px] font-black text-text-secondary opacity-30 tracking-tighter">{m.l}</span>
                            <input 
                               type="number" 
                               value={m.v} 
                               onChange={(e) => {
                                 const newVal = parseInt(e.target.value) || 0;
                                 setDetectedItems(prev => prev.map((di, i) => i === idx ? { ...di, [m.f]: newVal } : di));
                               }}
                               className={`text-[11px] font-black bg-transparent outline-none w-8 text-right`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={handleAddDetectedItem}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-border-light text-text-secondary text-[13px] font-black flex items-center justify-center gap-2 active:bg-input-bg transition-colors"
                  >
                    <Plus size={16} className="stroke-[3px]" /> Add another item
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-6">
            <button 
              disabled={detectedItems.length === 0}
              onClick={handleSaveToMeal}
              className="w-full bg-primary h-[54px] rounded-xl text-white font-black text-[15px] shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={20} />
              Save to {selectedMealType}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <AnimatePresence mode="wait">
        {screen === 1 && (
          <motion.div 
            key="s1" 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            {renderScreen1()}
          </motion.div>
        )}
        {screen === 2 && (
          <motion.div 
            key="s2" 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: 20 }} 
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full"
          >
            {renderScreen2()}
          </motion.div>
        )}
        {screen === 3 && (
          <motion.div 
            key="s3" 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 40 }} 
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="h-full absolute inset-0 z-[100]"
          >
            {renderScreen3()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
