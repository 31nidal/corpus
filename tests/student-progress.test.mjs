import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validReading,mergeReading} from '../shared/studentProgress.mjs'
test('lecture : validation bornée et rejet des données invalides',()=>{
 assert.equal(validReading({a:{percent:62,updatedAt:123,section:'renal'}}),true)
 for(const value of [[],null,{a:{percent:101,updatedAt:123}},{a:{percent:1,updatedAt:-1}},{a:{percent:1,updatedAt:123,section:42}}])assert.equal(validReading(value),false)
})
test('lecture multi-appareils : progression maximale et section la plus récente',()=>{
 assert.deepEqual(mergeReading({a:{percent:20,updatedAt:200,section:'new'}},{a:{percent:62,updatedAt:100,section:'old'}}),{a:{percent:62,updatedAt:200,section:'new'}})
 assert.deepEqual(mergeReading({a:{percent:90,updatedAt:50}},{a:{percent:62,updatedAt:100,section:'old'}}),{a:{percent:90,updatedAt:100,section:'old'}})
})
