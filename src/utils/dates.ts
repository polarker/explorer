/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

export const formatToDay = (dt: Date): string => {
  const day = dt.getDate().toString().padStart(2, '0')
  return day
}

export const formatToDayMonthYear = (dt: Date): string => {
  const day = dt.getDate().toString().padStart(2, '0')
  const month = (dt.getMonth() + 1).toString().padStart(2, '0')
  const year = dt.getFullYear()
  return `${day}/${month}/${year}`
}
